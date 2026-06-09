import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Proxy — JWT-based server-side route protection (Next.js 16 convention).
//
// Protects all routes except the public auth pages and Next.js internals.
// Reads the bearer token from the `mcp.token` httpOnly cookie (set by the
// /api/auth/login Route Handler after successful login).
//
// Runtime: Node.js (Next.js 16). Unlike the old middleware.ts which ran on
// the Edge runtime, proxy.ts runs on the full Node.js runtime. This means
// Buffer IS available here — the Web Crypto path below is kept for
// consistency with the webhook handler, but the Buffer-avoidance workaround
// in lib/jwt.ts (the duplicate Web Crypto path) could be consolidated now
// that both files share the same runtime. Tracked as a simplification
// opportunity: lib/jwt.ts's verifyJwt() and this verifySignature() can be
// unified into a single shared function.
//
// JWT_SECRET must match the backend secret.
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = new Set(["/login", "/signup"])

function isInternalPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    /\.(?:png|svg|jpg|jpeg|ico|webp|woff2?)$/.test(pathname)
  )
}

function getToken(req: NextRequest): string | null {
  // Read only from the httpOnly cookie — never from localStorage (inaccessible
  // at the edge) or a JS-readable cookie (XSS-exposed).
  return req.cookies.get("mcp.token")?.value ?? null
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
  } catch {
    return null
  }
}

function isTokenExpired(claims: Record<string, unknown>): boolean {
  return typeof claims.exp === "number" && claims.exp * 1000 < Date.now()
}

// TODO: Now that proxy.ts runs on the Node.js runtime (Next.js 16),
// this Web Crypto path duplicates lib/jwt.ts → verifyJwt(). The original
// Buffer-avoidance workaround is no longer necessary here. Both can be
// consolidated into a single shared helper — tracked in the auth ADR.
async function verifySignature(token: string, secret: string): Promise<boolean> {
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
    return crypto.subtle.verify("HMAC", key, sig, enc.encode(`${headerB64}.${payloadB64}`))
  } catch {
    return false
  }
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = getToken(req)
  if (!token) return false

  const claims = decodePayload(token)
  if (!claims || isTokenExpired(claims)) return false

  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      // JWT_SECRET not set — accept any structurally valid non-expired token.
      // Only acceptable in local dev; never deploy without JWT_SECRET set.
      console.warn("[proxy] JWT_SECRET is not set — token signature NOT verified.")
      return true
    }
    // Non-development: crash fast rather than run with unverified tokens.
    throw new Error("[proxy] JWT_SECRET must be set in non-development environments.")
  }

  return verifySignature(token, secret)
}

// Next.js 16: the proxy entry point must use `export default function proxy`.
// A named export silently becomes a no-op — all routes would be unprotected.
// The config export is unchanged.
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isInternalPath(pathname)) return NextResponse.next()

  const isPublic = PUBLIC_PATHS.has(pathname)
  const authenticated = await isAuthenticated(req)

  if (!authenticated && !isPublic) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (authenticated && isPublic) {
    const homeUrl = req.nextUrl.clone()
    homeUrl.pathname = "/"
    homeUrl.searchParams.delete("next")
    return NextResponse.redirect(homeUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
