import { describe, it, expect, beforeEach, vi } from "vitest"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"

// Force in-memory backend by ensuring Upstash env vars are absent.
beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
})

describe("checkRateLimit (in-memory backend)", () => {
  it("allows requests below the limit", async () => {
    const key = `test:ratelimit:${Date.now()}:allow`
    const result = await checkRateLimit(key, 5, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("blocks when limit is exceeded", async () => {
    const key = `test:ratelimit:${Date.now()}:block`
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(key, 3, 60_000)
    }
    const overflow = await checkRateLimit(key, 3, 60_000)
    expect(overflow.allowed).toBe(false)
    expect(overflow.remaining).toBe(0)
  })

  it("counts remaining correctly across multiple calls", async () => {
    const key = `test:ratelimit:${Date.now()}:remaining`
    const r1 = await checkRateLimit(key, 5, 60_000)
    const r2 = await checkRateLimit(key, 5, 60_000)
    const r3 = await checkRateLimit(key, 5, 60_000)
    expect(r1.remaining).toBe(4)
    expect(r2.remaining).toBe(3)
    expect(r3.remaining).toBe(2)
  })

  it("resets after the window expires", async () => {
    const key = `test:ratelimit:${Date.now()}:reset`
    // Exhaust limit with a very short window (1 ms).
    for (let i = 0; i < 2; i++) {
      await checkRateLimit(key, 2, 1)
    }
    const blocked = await checkRateLimit(key, 2, 1)
    expect(blocked.allowed).toBe(false)

    // Wait for the window to expire.
    await new Promise((r) => setTimeout(r, 10))
    const allowed = await checkRateLimit(key, 2, 60_000)
    expect(allowed.allowed).toBe(true)
  })

  it("provides a resetAt timestamp in the future", async () => {
    const key = `test:ratelimit:${Date.now()}:resetAt`
    const before = Date.now()
    const result = await checkRateLimit(key, 5, 60_000)
    expect(result.resetAt).toBeGreaterThanOrEqual(before)
  })

  it("tracks separate keys independently", async () => {
    const ts = Date.now()
    const keyA = `test:ratelimit:${ts}:A`
    const keyB = `test:ratelimit:${ts}:B`
    for (let i = 0; i < 2; i++) await checkRateLimit(keyA, 2, 60_000)
    const blockedA = await checkRateLimit(keyA, 2, 60_000)
    const allowedB = await checkRateLimit(keyB, 2, 60_000)
    expect(blockedA.allowed).toBe(false)
    expect(allowedB.allowed).toBe(true)
  })
})

describe("getClientIp", () => {
  it("extracts first IP from X-Forwarded-For", () => {
    const req = new Request("https://example.com/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    expect(getClientIp(req)).toBe("1.2.3.4")
  })

  it("falls back to x-real-ip when XFF is absent", () => {
    const req = new Request("https://example.com/", {
      headers: { "x-real-ip": "9.10.11.12" },
    })
    expect(getClientIp(req)).toBe("9.10.11.12")
  })

  it("returns 'unknown' when no IP headers are present", () => {
    const req = new Request("https://example.com/")
    expect(getClientIp(req)).toBe("unknown")
  })
})
