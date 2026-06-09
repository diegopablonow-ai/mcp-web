import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// Clears the httpOnly auth cookies. The client calls this instead of touching
// localStorage directly.
// ---------------------------------------------------------------------------

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set("mcp.token", "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 })
  res.cookies.set("mcp.refreshToken", "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 })
  return res
}
