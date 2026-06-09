"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { Boxes } from "lucide-react"

// Routes that don't require authentication.
const PUBLIC_ROUTES = ["/login", "/signup"]

/**
 * AppShell renders the persistent sidebar + navbar chrome for authenticated
 * routes. Route protection is handled authoritatively at the edge by proxy.ts
 * (HMAC-SHA256 JWT verification before any page renders).
 *
 * The loading spinner is only shown when we're on a protected route and the
 * server did NOT confirm a token cookie (i.e. the user just logged in during
 * this client navigation and the /api/auth/me call hasn't resolved yet).
 * On hard reload, `isAuthenticated` is already `true` from the server hint,
 * so the shell renders immediately — no flash.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuth()
  const isPublic = PUBLIC_ROUTES.includes(pathname)

  // Auth pages render without chrome.
  if (isPublic) return <>{children}</>

  // Only block render if we genuinely don't know the auth state yet.
  // `initialAuthenticated` from the server means `isAuthenticated` is already
  // true here, so this branch is only hit for unauthenticated client navigations.
  if (loading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="flex size-10 animate-pulse items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-6" />
          </div>
          <p className="text-sm">Loading workspace…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
