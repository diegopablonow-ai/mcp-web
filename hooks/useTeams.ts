"use client"

import useSWR from "swr"
import { teamService } from "@/services/teamService"
import type { Team } from "@/lib/types"

// SWR-powered hooks for team data. Centralizes fetching, caching and
// revalidation so multiple components stay in sync.
//
// The optional `initialData` parameter accepts pre-fetched data from a server
// component (via fetchTeams()). Passing it sets SWR's `fallbackData` so
// the hook returns real data immediately — no loading state on first render.

export function useTeams(initialData?: Team[]) {
  const { data, error, isLoading, mutate } = useSWR<Team[]>(
    "/teams",
    () => teamService.list(),
    { fallbackData: initialData },
  )
  return { teams: data ?? [], error, isLoading, mutate }
}

export function useTeam(teamId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Team>(
    teamId ? `/teams/${teamId}` : null,
    () => teamService.get(teamId as string),
  )
  return { team: data, error, isLoading, mutate }
}
