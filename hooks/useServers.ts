"use client"

import useSWR from "swr"
import { serverService } from "@/services/serverService"
import type { Server } from "@/lib/types"

// SWR-powered hooks for deployed servers.
//
// The optional `initialData` parameter accepts pre-fetched data from a server
// component (via fetchServers()). Passing it sets SWR's `fallbackData` so
// the hook returns real data immediately — no loading state on first render.
// SWR still revalidates in the background to pick up any changes since the
// server render.

export function useServers(initialData?: Server[]) {
  const { data, error, isLoading, mutate } = useSWR<Server[]>(
    "/servers",
    () => serverService.list(),
    { fallbackData: initialData },
  )
  return { servers: data ?? [], error, isLoading, mutate }
}

export function useServer(serverId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Server>(
    serverId ? `/servers/${serverId}` : null,
    () => serverService.get(serverId as string),
  )
  return { server: data, error, isLoading, mutate }
}
