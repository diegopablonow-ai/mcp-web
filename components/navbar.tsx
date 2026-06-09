"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Server,
  Code2,
  CreditCard,
  ScrollText,
  LogOut,
  Menu,
} from "lucide-react"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useAuth } from "@/hooks/useAuth"
import { initials, roleBadge } from "@/lib/helpers"
import { cn } from "@/lib/utils"

const ICONS = {
  LayoutDashboard,
  Users,
  Sparkles,
  Server,
  Code2,
  CreditCard,
  ScrollText,
} as const

const NAV = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Teams", href: "/teams", icon: "Users" },
  { label: "AI Jobs", href: "/ai-jobs", icon: "Sparkles" },
  { label: "Servers", href: "/servers", icon: "Server" },
  { label: "Editor", href: "/editor/demo-project", icon: "Code2" },
  { label: "Billing", href: "/billing", icon: "CreditCard" },
  { label: "Logs", href: "/logs", icon: "ScrollText" },
] as const

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/teams": "Teams",
  "/ai-jobs": "AI Jobs",
  "/servers": "Servers",
  "/billing": "Billing",
  "/logs": "Observability",
  "/editor": "Editor",
}

export function Navbar() {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()

  const title =
    TITLES[pathname] ??
    TITLES[`/${pathname.split("/")[1]}`] ??
    "MCP Builder"

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile nav */}
        <Sheet>
          <SheetTrigger
            render={(props) => (
              <Button {...props} variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            )}
          />
          <SheetContent side="left" className="w-64 p-0">
            <nav className="flex flex-col gap-1 p-3 pt-6" aria-label="Mobile">
              {NAV.map((item) => {
                const Icon = ICONS[item.icon]
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <button {...props} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 outline-none hover:bg-accent">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold uppercase text-primary">
                    {initials(user?.name ?? user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-none">
                    {user?.name ?? user?.email ?? "User"}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("mt-1 h-4 px-1.5 text-[10px]", roleBadge(user?.role ?? "member"))}
                  >
                    {user?.role ?? "member"}
                  </Badge>
                </span>
              </button>
            )}
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm">{user?.email}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {isAdmin ? "Administrator" : "Team member"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/billing">Billing &amp; usage</Link>} />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
