"use client"

import Link from "next/link"
import { Server as ServerIcon, Globe, Play, Square, ExternalLink, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { serverStatusColor, relativeTime } from "@/lib/helpers"
import type { Server } from "@/lib/types"

export function ServerCard({
  server,
  onToggle,
  busy,
}: {
  server: Server
  onToggle?: (server: Server) => void
  busy?: boolean
}) {
  // Resolve the primary URL: custom domain > platform domain > Railway fallback.
  const primaryUrl =
    server.customDomain
      ? `https://${server.customDomain}`
      : server.platformDomain
        ? `https://${server.platformDomain}`
        : server.railwayUrl ?? server.url
  const usingFallback = !server.customDomain && !server.platformDomain
  const running = server.status === "running"

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
              <ServerIcon className="size-5" />
            </div>
            <div>
              <Link
                href={`/servers/${server.id}`}
                className="font-medium leading-tight hover:underline"
              >
                {server.name ?? server.id}
              </Link>
              <p className="text-xs text-muted-foreground">
                {server.region ?? "—"} · {relativeTime(server.lastDeployedAt)}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("capitalize", serverStatusColor(server.status))}
          >
            {server.status ?? "unknown"}
          </Badge>
        </div>

        <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
          <a
            href={primaryUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
          >
            <Globe className="size-3.5 shrink-0" />
            <span className="truncate">{primaryUrl.replace("https://", "")}</span>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
          </a>
          <p className="text-xs text-muted-foreground">
            {usingFallback
              ? "Using platform fallback URL — add a custom domain"
              : `Platform: ${server.platformDomain ?? "—"}`}
          </p>
        </div>

        {onToggle ? (
          <Button
            variant={running ? "outline" : "default"}
            size="sm"
            className="w-full"
            disabled={busy || server.status === "deploying"}
            onClick={() => onToggle(server)}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : running ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? "Stop server" : "Start server"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
