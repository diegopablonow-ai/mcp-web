import { NextRequest, NextResponse } from "next/server"
import { decodeJwt, isTokenExpired, userFromClaims } from "@/lib/jwt"

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Decodes the httpOnly mcp.token cookie server-side and returns the user
// object. Used by AuthProvider on mount to rehydrate state after a hard reload.
// ---------------------------------------------------------------------------

export function GET(req: NextRequest) {
  const token = req.cookies.get("mcp.token")?.value
  if (!token) return NextResponse.json({ user: null }, { status: 401 })

  const claims = decodeJwt(token)
  if (!claims || isTokenExpired(claims))
    return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({ user: userFromClaims(claims) })
}
