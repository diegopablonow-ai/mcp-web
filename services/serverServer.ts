"use server"

import { cacheTag } from "next/cache"
import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { Server } from "@/lib/types"
import { mockServers } from "@/lib/mock-data"

/**
 * Fetch and cache the full server list for Server Components.
 * Invalidate with revalidateTag("servers", "max") after deploys, status
 * changes, or domain mutations.
 */
export async function fetchServers(): Promise<Server[]> {
  "use cache"
  cacheTag("servers")
  return withMock(
    () => apiFetch<Server[]>("/servers"),
    () => delay(mockServers),
    USE_MOCK_FALLBACK,
  )
}
