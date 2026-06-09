"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import {
  Activity,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Circle,
  Pause,
  Play,
} from "lucide-react"
import { observabilityService } from "@/services/observabilityService"
import type { LogEntry } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/helpers"

const LEVEL_META = {
  info: { icon: Info, cls: "text-sky-500", badge: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  warn: { icon: AlertTriangle, cls: "text-amber-500", badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  error: { icon: AlertCircle, cls: "text-destructive", badge: "border-destructive/30 bg-destructive/10 text-destructive" },
  debug: { icon: Bug, cls: "text-muted-foreground", badge: "border-border bg-muted text-muted-foreground" },
} as const

type Level = keyof typeof LEVEL_META
const FILTERS: ("all" | Level)[] = ["all", "info", "warn", "error", "debug"]

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

export function ObservabilityView() {
  const { data, isLoading } = useSWR<LogEntry[]>("/logs", () =>
    observabilityService.getLogs(),
  )
  const [live, setLive] = useState<LogEntry[]>([])
  const [streaming, setStreaming] = useState(true)
  const [filter, setFilter] = useState<"all" | Level>("all")
  const listRef = useRef<HTMLDivElement>(null)

  // Real-time log stream (integration point: SSE/WebSocket from backend).
  useEffect(() => {
    if (!streaming) return
    const unsub = observabilityService.subscribe((entry) => {
      setLive((prev) => [...prev.slice(-100), entry])
    })
    return unsub
  }, [streaming])

  const all = [...(data ?? []), ...live]
  const filtered = filter === "all" ? all : all.filter((l) => l.level === filter)

  const errorCount = all.filter((l) => l.level === "error").length
  const warnCount = all.filter((l) => l.level === "warn").length

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Observability"
        description="Live logs, metrics, and job history across your MCP infrastructure."
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total events" value={all.length} icon={Activity} />
        <StatCard label="Errors" value={errorCount} icon={AlertCircle} accent="text-destructive" />
        <StatCard label="Warnings" value={warnCount} icon={AlertTriangle} accent="text-amber-500" />
        <StatCard
          label="Stream"
          value={streaming ? "Live" : "Paused"}
          icon={Circle}
          accent={streaming ? "text-emerald-500" : "text-muted-foreground"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base">Log stream</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStreaming((s) => !s)}
            >
              {streaming ? <Pause className="size-4" /> : <Play className="size-4" />}
              {streaming ? "Pause" : "Resume"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div
              ref={listRef}
              className="max-h-[28rem] overflow-y-auto rounded-md bg-muted/40 font-mono text-xs"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-muted-foreground">No log entries.</p>
              ) : (
                filtered
                  .slice()
                  .reverse()
                  .map((log) => {
                    const meta = LEVEL_META[log.level]
                    const Icon = meta.icon
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 border-b border-border/50 px-3 py-2 last:border-0"
                      >
                        <span className="shrink-0 text-muted-foreground">{timeOf(log.timestamp)}</span>
                        <Icon className={cn("mt-0.5 size-3.5 shrink-0", meta.cls)} />
                        <Badge variant="outline" className={cn("shrink-0 text-[10px]", meta.badge)}>
                          {log.source}
                        </Badge>
                        <span className="text-foreground">{log.message}</span>
                      </div>
                    )
                  })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
