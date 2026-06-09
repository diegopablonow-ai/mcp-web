"use server"

import { cacheTag } from "next/cache"
import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { Team } from "@/lib/types"
import { mockTeams } from "@/lib/mock-data"

/**
 * Fetch and cache the full team list for Server Components.
 * Invalidate with revalidateTag("teams", "max") after mutations.
 */
export async function fetchTeams(): Promise<Team[]> {
  "use cache"
  cacheTag("teams")
  return withMock(
    () => apiFetch<Team[]>("/teams"),
    () => delay(mockTeams),
    USE_MOCK_FALLBACK,
  )
}
