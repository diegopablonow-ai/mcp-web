import { NextResponse } from "next/server"
import { decodeJwt, userFromClaims } from "@/lib/jwt"
import { checkRateLimit, getClientIp } from "@/lib/rateLimit"
import { AuthBodySchema } from "@/lib/validation"

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mcp-builder.com"
const IS_PROD = process.env.NODE_ENV === "production"
const USE_MOCK = process.env.NODE_ENV !== "production" && process.env.MOCK_AUTH === "true"

const COOKIE_OPTS = (maxAge: number) => ({
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "strict" as const,
  path: "/",
  maxAge,
})

function isTrustedOrigin(req: Request): boolean {
  if (!IS_PROD) return true
  const origin = req.headers.get("origin")
  if (!origin) return false
  const allowed = process.env.ALLOWED_ORIGIN ?? new URL(req.url).origin
  return origin === allowed
}

export async function POST(req: Request) {
  // 1. CSRF origin check
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 2. Rate limiting — 5 signups per IP per hour
  const ip = getClientIp(req)
  const rl = await checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    )
  }

  // 3. Parse + validate input
  const raw = await req.json().catch(() => ({}))
  const parsed = AuthBodySchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid input."
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const { email, password } = parsed.data

  if (USE_MOCK) {
    const { buildMockTokensForRoute } = await import("@/lib/mock-auth")
    const tokens = await buildMockTokensForRoute(email)
    const claims = decodeJwt(tokens.token)!
    const res = NextResponse.json({ ok: true, user: userFromClaims(claims) })
    res.cookies.set("mcp.token", tokens.token, COOKIE_OPTS(60 * 60 * 24 * 7))
    res.cookies.set("mcp.refreshToken", tokens.refreshToken, COOKIE_OPTS(60 * 60 * 24 * 30))
    return res
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await upstream.json()
    if (!upstream.ok)
      return NextResponse.json(
        { error: data.message ?? "Signup failed." },
        { status: upstream.status },
      )

    const { token, refreshToken } = data as { token: string; refreshToken?: string }
    const claims = decodeJwt(token)
    const res = NextResponse.json({ ok: true, user: claims ? userFromClaims(claims) : null })
    res.cookies.set("mcp.token", token, COOKIE_OPTS(60 * 60 * 24 * 7))
    if (refreshToken) res.cookies.set("mcp.refreshToken", refreshToken, COOKIE_OPTS(60 * 60 * 24 * 30))
    return res
  } catch {
    return NextResponse.json({ error: "Could not reach authentication server." }, { status: 502 })
  }
}
