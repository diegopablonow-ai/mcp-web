// Application-wide constants

export const APP_NAME = "MCP Builder"

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mcp-builder.com"

// Mock fallback is hard-gated to non-production builds.
// In production this is always false regardless of env vars.
export const USE_MOCK_FALLBACK =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_USE_MOCK === "true"

export const JOB_POLL_INTERVAL = 2500

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Teams", href: "/teams", icon: "Users" },
  { label: "AI Jobs", href: "/ai-jobs", icon: "Sparkles" },
  { label: "Servers", href: "/servers", icon: "Server" },
  { label: "Editor", href: "/editor/demo-project", icon: "Code2" },
  { label: "Billing", href: "/billing", icon: "CreditCard" },
  { label: "Logs", href: "/logs", icon: "ScrollText" },
] as const
