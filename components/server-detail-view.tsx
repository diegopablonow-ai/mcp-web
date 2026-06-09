"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { toast } from "sonner"
import {
  ArrowLeft,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Play,
  Square,
  Loader2,
  Server as ServerIcon,
} from "lucide-react"
import { useServer } from "@/hooks/useServers"
import { serverService } from "@/services/serverService"
import type { CustomDomain, Server } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { serverStatusColor, formatDateTime, cn } from "@/lib/helpers"

export function ServerDetailView({ serverId }: { serverId: string }) {
  const { server, isLoading, mutate } = useServer(serverId)
  const { data: domains, mutate: mutateDomains } = useSWR<CustomDomain[]>(
    "/custom-domains",
    () => serverService.listDomains(),
  )
  const [newDomain, setNewDomain] = useState("")
  const [busy, setBusy] = useState(false)

  const serverDomains = (domains ?? []).filter((d) => d.serverId === serverId)

  async function toggleStatus(s: Server) {
    setBusy(true)
    const next = s.status === "running" ? "stopped" : "running"
    try {
      await serverService.setStatus(s.id, next)
      await mutate()
      toast.success(`Server ${next === "running" ? "started" : "stopped"}.`)
    } catch {
      toast.error("Failed to update status.")
    } finally {
      setBusy(false)
    }
  }

  async function addDomain() {
    if (!newDomain.trim()) return
    setBusy(true)
    try {
      await serverService.addDomain(newDomain.trim(), serverId)
      setNewDomain("")
      await Promise.all([mutate(), mutateDomains()])
      toast.success("Domain added. DNS verification pending.")
    } catch {
      toast.error("Failed to add domain.")
    } finally {
      setBusy(false)
    }
  }

  async function removeDomain(id: string) {
    try {
      await serverService.removeDomain(id)
      await Promise.all([mutate(), mutateDomains()])
      toast.success("Domain removed.")
    } catch {
      toast.error("Failed to remove domain.")
    }
  }

  if (isLoading && !server) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!server) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Server not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const running = server.status === "running"
  // Resolve primary URL: custom domain > platform domain > Railway fallback.
  const primaryUrl = server.customDomain
    ? `https://${server.customDomain}`
    : server.platformDomain
      ? `https://${server.platformDomain}`
      : server.railwayUrl ?? server.url

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <Link
        href="/servers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All servers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-primary">
            <ServerIcon className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{server.name ?? server.id}</h2>
            <p className="text-sm text-muted-foreground">
              {server.region ?? "—"} · deployed {formatDateTime(server.lastDeployedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("capitalize", serverStatusColor(server.status))}>
            {server.status ?? "unknown"}
          </Badge>
          <Button
            variant={running ? "outline" : "default"}
            disabled={busy || server.status === "deploying"}
            onClick={() => toggleStatus(server)}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : running ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {running ? "Stop" : "Start"}
          </Button>
        </div>
      </div>

      {/* URLs: custom domain, platform domain, Railway fallback */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <UrlRow label="Primary" value={primaryUrl} highlight />
          {server.platformDomain && (
            <UrlRow label="Platform domain" value={`https://${server.platformDomain}`} />
          )}
          {server.railwayUrl && (
            <UrlRow label="Railway fallback" value={server.railwayUrl} />
          )}
          {!server.customDomain && (
            <p className="text-xs text-muted-foreground">
              No custom domain configured — requests use the platform fallback URL above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom domains management */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Custom domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="api.yourcompany.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDomain()}
            />
            <Button onClick={addDomain} disabled={busy || !newDomain.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add
            </Button>
          </div>

          {serverDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom domains yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {serverDomains.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{d.domain}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        d.status === "active"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : d.status === "pending"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive",
                      )}
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeDomain(d.id)}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove domain</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function UrlRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex items-center gap-1.5 truncate text-sm hover:text-primary",
          highlight ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="truncate">{value.replace("https://", "")}</span>
        <ExternalLink className="size-3 shrink-0" />
      </a>
    </div>
  )
}
