"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/authService"
import type { User } from "@/lib/types"

// -----------------------------------------------------------------------------
// AuthProvider — global authentication state.
//
// User identity is derived from the login/signup response body (the Route
// Handler decodes the JWT server-side and returns the user object). Tokens
// are never accessible to JS — they live in httpOnly cookies only.
//
// On hard reload the client has no way to read the httpOnly token, so we
// call /api/auth/me to rehydrate the user from the server-decoded cookie.
//
// `initialAuthenticated` is a Server Component hint: if the mcp.token cookie
// was present when the layout rendered, proxy.ts has already verified the JWT,
// so we can treat the session as authenticated immediately — before /api/auth/me
// resolves — eliminating the full-screen loading flash on hard reload.
// -----------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({
  children,
  initialAuthenticated = false,
}: {
  children: React.ReactNode
  initialAuthenticated?: boolean
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  // If the server already confirmed a token cookie exists, start in a
  // non-loading state so AppShell renders the shell immediately.
  const [loading, setLoading] = useState(!initialAuthenticated)

  // Rehydrate user on mount by asking the server to decode the httpOnly cookie.
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Handle session expiry dispatched by apiFetch 401 interceptor.
  useEffect(() => {
    function handleExpired() {
      setUser(null)
      router.replace("/login")
    }
    window.addEventListener("mcp:session-expired", handleExpired)
    return () => window.removeEventListener("mcp:session-expired", handleExpired)
  }, [router])

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password)
    setUser(u)
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    const u = await authService.signup(email, password)
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
    router.push("/login")
  }, [router])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      // Treat as authenticated if the server confirmed a token cookie OR if
      // the /api/auth/me call has resolved a user object.
      isAuthenticated: initialAuthenticated || !!user,
      isAdmin: user?.role === "admin",
      login,
      signup,
      logout,
    }),
    [user, loading, initialAuthenticated, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
