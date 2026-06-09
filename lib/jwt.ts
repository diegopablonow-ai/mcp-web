// ---------------------------------------------------------------------------
// lib/jwt.ts — canonical server-side JWT utilities.
//
// Used by every Route Handler that needs to read or verify a token.
// Never import this from client components — client-side user hydration
// goes through /api/auth/me instead.
//
// Runtime note: proxy.ts previously maintained a duplicate Web Crypto
// verifySignature() because proxy.ts ran on the Edge runtime where Buffer
// was unavailable. In Next.js 16, proxy.ts runs on the Node.js runtime,
// so this duplication is no longer necessary. Consolidating the two into
// a shared helper is a tracked simplification (see auth ADR).
// ---------------------------------------------------------------------------

import { type NextRequest } from "next/server"
import type { User } from "@/lib/types"

export interface JwtClaims extends Record<string, unknown> {
  sub?: string
  email?: string
  name?: string
  role?: string
  exp?: number
}

/** Decode a JWT payload without verifying the signature. */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    return JSON.parse(
      Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as JwtClaims
  } catch {
    return null
  }
}

/** True when the exp claim is present and in the past. */
export function isTokenExpired(claims: JwtClaims): boolean {
  return typeof claims.exp === "number" && claims.exp * 1000 < Date.now()
}

/** Map standard JWT claims to a User object. */
export function userFromClaims(claims: JwtClaims): User {
  return {
    id: claims.sub ?? "unknown",
    email: claims.email ?? "",
    name: claims.name,
    role: (claims.role as User["role"]) ?? "member",
  }
}

/**
 * Verify a JWT's HMAC-SHA256 signature using Web Crypto (edge-compatible).
 * Returns { valid, claims } — claims is non-null only when valid is true.
 *
 * JWT_SECRET behaviour by environment:
 *   - development: absent → console.warn and skip signature check (local dev only).
 *   - test / staging / production: absent → throws immediately so the deployment
 *     fails fast rather than running with unverified tokens silently accepted.
 *
 * Mirror any logic changes here in proxy.ts → verifySignature().
 */
export async function verifyJwt(
  token: string,
): Promise<{ valid: boolean; claims: JwtClaims | null }> {
  const claims = decodeJwt(token)
  if (!claims) return { valid: false, claims: null }
  if (isTokenExpired(claims)) return { valid: false, claims: null }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[jwt] JWT_SECRET is not set — token signature is NOT verified. " +
          "This is only acceptable in local development.",
      )
      return { valid: true, claims }
    }
    throw new Error(
      "[jwt] JWT_SECRET must be set in non-development environments. " +
        "Add it to your environment variables and redeploy.",
    )
  }

  try {
    const enc = new TextEncoder()
    const [headerB64, payloadB64, sigB64] = token.split(".")
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    )
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      enc.encode(`${headerB64}.${payloadB64}`),
    )
    return { valid, claims: valid ? claims : null }
  } catch {
    return { valid: false, claims: null }
  }
}

/**
 * Verify the mcp.token httpOnly cookie from a NextRequest using the
 * built-in cookies API — no manual header parsing needed.
 * Use this in all Route Handlers (NextRequest is always available there).
 */
export async function verifyNextRequestCookie(req: NextRequest): Promise<{
  valid: boolean
  claims: JwtClaims | null
  user: User | null
}> {
  const token = req.cookies.get("mcp.token")?.value
  if (!token) return { valid: false, claims: null, user: null }

  const { valid, claims } = await verifyJwt(token)
  return {
    valid,
    claims,
    user: valid && claims ? userFromClaims(claims) : null,
  }
}
