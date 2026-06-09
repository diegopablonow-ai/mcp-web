import type { JobStatus, ServerStatus, Role } from "./types"
// cn is the canonical tailwind-merge utility — import from lib/utils everywhere.
export { cn } from "./utils"

// Pin locale to "en-US" on all date/time helpers.
// Using `undefined` (system locale) resolves differently between Node.js (server)
// and browser, causing React hydration mismatches for any server-rendered output.
const LOCALE = "en-US"

export function formatDate(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatDateTime(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function relativeTime(iso?: string) {
  if (!iso) return "—"
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return "—"
  const diff = Date.now() - then
  const s = Math.round(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}

export function jobStatusColor(status: JobStatus): string {
  switch (status) {
    case "succeeded":
      return "text-chart-3 bg-chart-3/10 border-chart-3/20"
    case "running":
      return "text-chart-1 bg-chart-1/10 border-chart-1/20"
    case "queued":
      return "text-chart-4 bg-chart-4/10 border-chart-4/20"
    case "failed":
      return "text-destructive bg-destructive/10 border-destructive/20"
    default:
      return "text-muted-foreground bg-muted border-border"
  }
}

export function serverStatusColor(status?: ServerStatus): string {
  switch (status) {
    case "running":
      return "text-chart-3 bg-chart-3/10 border-chart-3/20"
    case "deploying":
      return "text-chart-1 bg-chart-1/10 border-chart-1/20"
    case "stopped":
      return "text-muted-foreground bg-muted border-border"
    case "error":
      return "text-destructive bg-destructive/10 border-destructive/20"
    default:
      return "text-muted-foreground bg-muted border-border"
  }
}

export function roleBadge(role: Role): string {
  return role === "admin"
    ? "text-chart-1 bg-chart-1/10 border-chart-1/20"
    : "text-muted-foreground bg-muted border-border"
}

export function quotaPercent(used = 0, limit = 0): number {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

/**
 * Derives 1–2 uppercase initials from a display name or email handle.
 * Single-word names produce one initial; multi-word names produce two.
 */
export function initials(value?: string) {
  if (!value) return "?"
  const parts = value.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const second = parts[1]?.[0] ?? ""
  return (first + second).toUpperCase() || "?"
}
