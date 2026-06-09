"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Server as ServerIcon } from "lucide-react"
import { useServers } from "@/hooks/useServers"
import { serverService } from "@/services/serverService"
import type { Server } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { ServerCard } from "@/components/server-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface ServersViewProps {
  /** Pre-fetched server data from the server component. Seeds SWR cache so no
   *  loading state is shown on initial render. Optional so the component can
   *  still be used standalone (e.g. in tests or Storybook). */
  initialServers?: Server[]
}

export function ServersView({ initialServers }: ServersViewProps) {
  const { servers, isLoading, mutate } = useServers(initialServers)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Start/stop a server, then revalidate the SWR cache.
  async function toggle(server: Server) {
    setBusyId(server.id)
    const next = server.status === "running" ? "stopped" : "running"
    try {
      await serverService.setStatus(server.id, next)
      await mutate()
      toast.success(`Server ${next === "running" ? "started" : "stopped"}.`)
    } catch {
      toast.error("Failed to update server status.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Servers"
        description="Deployed MCP servers across your team, with live deployment status."
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ServerIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No servers deployed yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onToggle={toggle}
              busy={busyId === server.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
