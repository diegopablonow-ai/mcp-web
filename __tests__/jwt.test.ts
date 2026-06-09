/**
 * Tests for lib/jwt.ts
 *
 * Tokens are generated with the same HS256 algorithm used by the app.
 * The helper at the bottom of this file mirrors the signing logic so tests
 * are self-contained — no dependency on a running backend.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { decodeJwt, isTokenExpired, userFromClaims, verifyJwt } from "@/lib/jwt"

const SECRET = "test-secret-at-least-32-characters-long"

// ---------------------------------------------------------------------------
// Minimal JWT builder (test-only) — mirrors the app's signing approach
// ---------------------------------------------------------------------------

function b64url(s: string): string {
  return Buffer.from(s)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

async function signJwt(payload: Record<string, unknown>, secret = SECRET): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = b64url(JSON.stringify(payload))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const raw = await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`))
  const sig = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return `${header}.${body}.${sig}`
}

function futureExp() {
  return Math.floor(Date.now() / 1000) + 3600 // 1 hour ahead
}
function pastExp() {
  return Math.floor(Date.now() / 1000) - 1 // already expired
}

// ---------------------------------------------------------------------------
// decodeJwt
// ---------------------------------------------------------------------------

describe("decodeJwt", () => {
  it("decodes a well-formed JWT payload", async () => {
    const token = await signJwt({ sub: "u1", email: "a@b.com", exp: futureExp() })
    const claims = decodeJwt(token)
    expect(claims).not.toBeNull()
    expect(claims?.sub).toBe("u1")
    expect(claims?.email).toBe("a@b.com")
  })

  it("returns null for a malformed token", () => {
    expect(decodeJwt("not.a.jwt")).toBeNull()
    expect(decodeJwt("")).toBeNull()
    expect(decodeJwt("only_one_part")).toBeNull()
  })

  it("returns null when the payload segment is invalid base64", () => {
    expect(decodeJwt("header.!!!invalid!!!.sig")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isTokenExpired
// ---------------------------------------------------------------------------

describe("isTokenExpired", () => {
  it("returns false for a future exp", () => {
    expect(isTokenExpired({ exp: futureExp() })).toBe(false)
  })

  it("returns true for a past exp", () => {
    expect(isTokenExpired({ exp: pastExp() })).toBe(true)
  })

  it("returns false when exp is absent (no expiry claim)", () => {
    // JWT without exp is treated as non-expired (server decides validity)
    expect(isTokenExpired({})).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// userFromClaims
// ---------------------------------------------------------------------------

describe("userFromClaims", () => {
  it("maps standard claims to a User object", () => {
    const user = userFromClaims({ sub: "u42", email: "x@y.com", name: "Alice", role: "admin" })
    expect(user).toEqual({ id: "u42", email: "x@y.com", name: "Alice", role: "admin" })
  })

  it("defaults id to 'unknown' when sub is missing", () => {
    const user = userFromClaims({ email: "x@y.com" })
    expect(user.id).toBe("unknown")
  })

  it("defaults role to 'member' when role is missing", () => {
    const user = userFromClaims({ sub: "u1", email: "x@y.com" })
    expect(user.role).toBe("member")
  })
})

// ---------------------------------------------------------------------------
// verifyJwt
// ---------------------------------------------------------------------------

describe("verifyJwt", () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: SECRET, NODE_ENV: "test" }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it("accepts a valid token with correct secret", async () => {
    const token = await signJwt({ sub: "u1", email: "a@b.com", exp: futureExp() })
    const { valid, claims } = await verifyJwt(token)
    expect(valid).toBe(true)
    expect(claims?.sub).toBe("u1")
  })

  it("rejects a token signed with a different secret", async () => {
    const token = await signJwt({ sub: "u1", exp: futureExp() }, "wrong-secret-completely-different")
    const { valid } = await verifyJwt(token)
    expect(valid).toBe(false)
  })

  it("rejects an expired token (correct secret)", async () => {
    const token = await signJwt({ sub: "u1", email: "a@b.com", exp: pastExp() })
    const { valid } = await verifyJwt(token)
    expect(valid).toBe(false)
  })

  it("rejects a structurally invalid token", async () => {
    const { valid } = await verifyJwt("garbage")
    expect(valid).toBe(false)
  })

  it("rejects a token with a tampered payload", async () => {
    const token = await signJwt({ sub: "u1", role: "member", exp: futureExp() })
    // Flip the role in the payload segment without re-signing.
    const [h, , s] = token.split(".")
    const tamperedPayload = b64url(JSON.stringify({ sub: "u1", role: "admin", exp: futureExp() }))
    const { valid } = await verifyJwt(`${h}.${tamperedPayload}.${s}`)
    expect(valid).toBe(false)
  })

  it("throws in non-development when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "production"
    const token = await signJwt({ sub: "u1", exp: futureExp() }, SECRET)
    await expect(verifyJwt(token)).rejects.toThrow("JWT_SECRET must be set")
  })

  it("warns and succeeds in development when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "development"
    const token = await signJwt({ sub: "u1", exp: futureExp() }, SECRET)
    const { valid } = await verifyJwt(token)
    expect(valid).toBe(true)
  })
})
