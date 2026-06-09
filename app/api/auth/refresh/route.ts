import { NextRequest, NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// Exchanges the httpOnly mcp.refreshToken cookie for a new access token,
// then rotates both cookies. Called by apiFetch on 401.
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mcp-builder.com"
const IS_PROD = process.env.NODE_ENV === "production"
const USE_MOCK = process.env.NODE_ENV !== "production" && process.env.MOCK_AUTH === "true"

export async function POST(req: NextRequest) {
  // Use the built-in cookies API — no manual header string parsing.
  const refreshToken = req.cookies.get("mcp.refreshToken")?.value

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token." }, { status: 401 })
  }

  // Mock path
  if (USE_MOCK) {
    const { buildMockTokensForRoute } = await import("@/lib/mock-auth")
    const tokens = await buildMockTokensForRoute("dev@mcp.dev")
    const res = NextResponse.json({ ok: true })
    res.cookies.set("mcp.token", tokens.token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })

    const data = await upstream.json()
    if (!upstream.ok) return NextResponse.json({ error: "Refresh failed." }, { status: 401 })

    const res = NextResponse.json({ ok: true })
    res.cookies.set("mcp.token", data.token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    if (data.refreshToken) {
      res.cookies.set("mcp.refreshToken", data.refreshToken, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    return res
  } catch {
    return NextResponse.json({ error: "Could not reach authentication server." }, { status: 502 })
  }
}
