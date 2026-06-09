/**
 * Tests for app/api/stripe/webhook/route.ts
 *
 * We test the private verifyStripeSignature function indirectly through the
 * POST handler. Mocking is kept minimal: we stub out the backend PATCH call
 * and the cache revalidation so tests don't need a real server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SECRET = "whsec_test_signing_secret_for_tests"

async function buildStripeSignature(
  payload: string,
  secret = SECRET,
  timestampOffset = 0,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000) + timestampOffset
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const raw = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`))
  const hex = Array.from(new Uint8Array(raw))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `t=${timestamp},v1=${hex}`
}

function makeRequest(body: object, signature: string): Request {
  const payload = JSON.stringify(body)
  return new Request("https://example.com/api/stripe/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  })
}

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

// Stub out next/cache so revalidateTag doesn't crash in the test environment.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}))

// Stub out the idempotency store so every event is treated as new by default.
vi.mock("@/lib/webhookIdempotency", () => ({
  markProcessed: vi.fn().mockResolvedValue(true),
}))

// Stub out the logger so tests don't produce noisy output.
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Stub out reportError.
vi.mock("@/lib/reportError", () => ({
  reportError: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Stripe webhook handler", () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      STRIPE_WEBHOOK_SECRET: SECRET,
      API_BASE_URL: "https://api.example.com",
      INTERNAL_API_SECRET: "internal-secret",
    }
    // Intercept backend PATCH calls.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    )
  })

  afterEach(() => {
    process.env = OLD_ENV
    vi.restoreAllMocks()
  })

  // Import lazily so env is set before module evaluation.
  async function getHandler() {
    const mod = await import("@/app/api/stripe/webhook/route")
    return mod.POST
  }

  it("returns 400 on missing stripe-signature header", async () => {
    const POST = await getHandler()
    const req = new Request("https://example.com/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt_1", type: "ping", data: { object: {} } }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 on invalid signature", async () => {
    const POST = await getHandler()
    const payload = JSON.stringify({ id: "evt_2", type: "ping", data: { object: {} } })
    const req = new Request("https://example.com/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=badhex" },
      body: payload,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 on a signature that is more than 5 minutes old", async () => {
    const POST = await getHandler()
    const payload = JSON.stringify({ id: "evt_3", type: "ping", data: { object: {} } })
    const sig = await buildStripeSignature(payload, SECRET, -(60 * 6)) // 6 min ago
    const req = makeRequest({ id: "evt_3", type: "ping", data: { object: {} } }, sig)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 200 with a valid signature", async () => {
    const POST = await getHandler()
    const event = { id: "evt_4", type: "unknown.event", data: { object: {} } }
    const sig = await buildStripeSignature(JSON.stringify(event))
    const req = makeRequest(event, sig)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })

  it("returns 200 and skips processing for a duplicate event", async () => {
    const { markProcessed } = await import("@/lib/webhookIdempotency")
    vi.mocked(markProcessed).mockResolvedValueOnce(false)

    const POST = await getHandler()
    const event = { id: "evt_dup", type: "checkout.session.completed", data: { object: {} } }
    const sig = await buildStripeSignature(JSON.stringify(event))
    const req = makeRequest(event, sig)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.duplicate).toBe(true)
  })

  it("calls backend PATCH on checkout.session.completed", async () => {
    const POST = await getHandler()
    const event = {
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "user-123",
          subscription: "sub_abc",
          customer: "cus_xyz",
        },
      },
    }
    const sig = await buildStripeSignature(JSON.stringify(event))
    const req = makeRequest(event, sig)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/users/user-123/subscription"),
      expect.objectContaining({ method: "PATCH" }),
    )
  })

  it("calls revalidateTag('billing', 'max') after checkout.session.completed", async () => {
    const { revalidateTag } = await import("next/cache")
    const POST = await getHandler()
    const event = {
      id: "evt_revalidate",
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "user-456",
          subscription: "sub_def",
          customer: "cus_abc",
        },
      },
    }
    const sig = await buildStripeSignature(JSON.stringify(event))
    const req = makeRequest(event, sig)
    await POST(req)
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith("billing", "max")
  })

  it("calls backend PATCH on customer.subscription.deleted", async () => {
    const POST = await getHandler()
    const event = {
      id: "evt_deleted",
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_deleted" } },
    }
    const sig = await buildStripeSignature(JSON.stringify(event))
    const req = makeRequest(event, sig)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/billing/by-customer/cus_deleted"),
      expect.objectContaining({ method: "PATCH" }),
    )
  })

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const POST = await getHandler()
    const event = { id: "evt_nosecret", type: "ping", data: { object: {} } }
    const req = new Request("https://example.com/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=abc" },
      body: JSON.stringify(event),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
