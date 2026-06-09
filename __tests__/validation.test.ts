/**
 * Tests for lib/validation.ts — AuthBodySchema and CheckoutBodySchema.
 *
 * Now that validation.ts uses real Zod (not the hand-rolled clone), these
 * tests also serve as a regression guard against accidental schema removal.
 */

import { describe, it, expect } from "vitest"
import { AuthBodySchema, CheckoutBodySchema } from "@/lib/validation"

// ---------------------------------------------------------------------------
// AuthBodySchema
// ---------------------------------------------------------------------------

describe("AuthBodySchema", () => {
  const valid = { email: "user@example.com", password: "securepass123" }

  it("accepts valid email + password", () => {
    const result = AuthBodySchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
      expect(result.data.password).toBe("securepass123")
    }
  })

  it("rejects missing email", () => {
    const result = AuthBodySchema.safeParse({ password: "securepass123" })
    expect(result.success).toBe(false)
  })

  it("rejects empty email", () => {
    const result = AuthBodySchema.safeParse({ email: "", password: "securepass123" })
    expect(result.success).toBe(false)
  })

  it("rejects email without @", () => {
    const result = AuthBodySchema.safeParse({ email: "notanemail", password: "securepass123" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toMatch(/email/i)
    }
  })

  it("rejects email longer than 254 chars", () => {
    const longEmail = "a".repeat(250) + "@b.com"
    const result = AuthBodySchema.safeParse({ email: longEmail, password: "securepass123" })
    expect(result.success).toBe(false)
  })

  it("rejects missing password", () => {
    const result = AuthBodySchema.safeParse({ email: "user@example.com" })
    expect(result.success).toBe(false)
  })

  it("rejects password shorter than 8 chars", () => {
    const result = AuthBodySchema.safeParse({ email: "user@example.com", password: "short" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toMatch(/8 characters/i)
    }
  })

  it("rejects password longer than 128 chars", () => {
    const result = AuthBodySchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(129),
    })
    expect(result.success).toBe(false)
  })

  it("rejects non-object input", () => {
    expect(AuthBodySchema.safeParse(null).success).toBe(false)
    expect(AuthBodySchema.safeParse("string").success).toBe(false)
    expect(AuthBodySchema.safeParse(42).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CheckoutBodySchema
// ---------------------------------------------------------------------------

describe("CheckoutBodySchema", () => {
  it("accepts plan-only checkout", () => {
    const result = CheckoutBodySchema.safeParse({ plan: "pro" })
    expect(result.success).toBe(true)
  })

  it("accepts extraQuota-only checkout", () => {
    const result = CheckoutBodySchema.safeParse({ extraQuota: 100 })
    expect(result.success).toBe(true)
  })

  it("accepts both plan and extraQuota", () => {
    const result = CheckoutBodySchema.safeParse({ plan: "scale", extraQuota: 500 })
    expect(result.success).toBe(true)
  })

  it("rejects when neither plan nor extraQuota is provided", () => {
    const result = CheckoutBodySchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message)
      expect(messages.some((m) => m.toLowerCase().includes("plan") || m.toLowerCase().includes("quota"))).toBe(true)
    }
  })

  it("rejects plan longer than 64 chars", () => {
    const result = CheckoutBodySchema.safeParse({ plan: "x".repeat(65) })
    expect(result.success).toBe(false)
  })

  it("rejects extraQuota of 0", () => {
    const result = CheckoutBodySchema.safeParse({ extraQuota: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects negative extraQuota", () => {
    const result = CheckoutBodySchema.safeParse({ extraQuota: -5 })
    expect(result.success).toBe(false)
  })

  it("rejects extraQuota above 100_000", () => {
    const result = CheckoutBodySchema.safeParse({ extraQuota: 100_001 })
    expect(result.success).toBe(false)
  })

  it("rejects non-integer extraQuota", () => {
    const result = CheckoutBodySchema.safeParse({ extraQuota: 3.5 })
    expect(result.success).toBe(false)
  })

  it("rejects non-string plan", () => {
    const result = CheckoutBodySchema.safeParse({ plan: 42 })
    expect(result.success).toBe(false)
  })
})
