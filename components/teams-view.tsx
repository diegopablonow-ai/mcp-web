"use client"

import { PageHeader } from "@/components/page-header"
import { TeamCard } from "@/components/team-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTeams } from "@/hooks/useTeams"
import { Users } from "lucide-react"
import type { Team } from "@/lib/types"

interface TeamsViewProps {
  /** Pre-fetched team data from the server component. Seeds SWR cache so no
   *  loading state is shown on initial render. */
  initialTeams?: Team[]
}

export function TeamsView({ initialTeams }: TeamsViewProps) {
  const { teams, isLoading } = useTeams(initialTeams)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Teams"
        description="Manage teams, members, roles, and AI quota across your workspace."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No teams yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  )
}
