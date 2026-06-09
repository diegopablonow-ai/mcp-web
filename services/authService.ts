// -----------------------------------------------------------------------------
// authService — login, signup, logout via Next.js Route Handlers.
//
// Tokens are set as httpOnly cookies by the server — this file never stores
// or reads tokens directly. User identity is derived from the token payload
// returned in the JSON response body (not from localStorage).
// -----------------------------------------------------------------------------

import type { User } from "@/lib/types"

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
  } catch {
    return null
  }
}

export function userFromToken(token: string): User | null {
  const claims = decodeJwt(token)
  if (!claims) return null
  return {
    id: (claims.sub as string) ?? "unknown",
    email: (claims.email as string) ?? "unknown@mcp.dev",
    name: (claims.name as string) ?? undefined,
    role: (claims.role as User["role"]) ?? "member",
  }
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Login failed.")

    // The Route Handler returns the decoded user so the client doesn't need
    // to read the httpOnly cookie.
    const user = data.user as User
    if (!user) throw new Error("Invalid response from auth server.")
    return user
  },

  async signup(email: string, password: string): Promise<User> {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? "Signup failed.")
    const user = data.user as User
    if (!user) throw new Error("Invalid response from auth server.")
    return user
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
  },
}
