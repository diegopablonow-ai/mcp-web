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
  Boxes,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/constants"

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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Boxes className="size-5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary">
        {NAV.map((item) => {
          const Icon = ICONS[item.icon]
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href.split("/").slice(0, 2).join("/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-md bg-sidebar-accent/50 px-3 py-2.5 text-xs text-sidebar-foreground/70">
          <p className="font-medium text-sidebar-foreground">Backend</p>
          <p className="mt-0.5 leading-relaxed">
            api.mcp-builder.com
          </p>
        </div>
      </div>
    </aside>
  )
}
