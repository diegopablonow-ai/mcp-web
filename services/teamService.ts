import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { Team, Role } from "@/lib/types"
import { mockTeams } from "@/lib/mock-data"

// -----------------------------------------------------------------------------
// teamService — consumes /teams, /teams/{teamId}, /teams/{teamId}/add-user
// -----------------------------------------------------------------------------

/**
 * Fetch and cache the full team list.
 * "use cache" (Next.js 16) serves this from the Next.js cache across
 * navigations. Invalidate with revalidateTag("teams", "max") after mutations
 * (member add/remove, team creation). The "max" cacheLife profile enables
 * stale-while-revalidate so the old value is served while the cache warms.
 */
export const teamService = {
  // GET /teams — delegates to the cached server function.
  async list(): Promise<Team[]> {
    return withMock(
      () => apiFetch<Team[]>("/teams"),
      () => delay(mockTeams),
      USE_MOCK_FALLBACK,
    )
  },

  // GET /teams/{teamId}
  async get(teamId: string): Promise<Team> {
    return withMock(
      () => apiFetch<Team>(`/teams/${teamId}`),
      () => {
        const team = mockTeams.find((t) => t.id === teamId)
        if (!team) throw new Error("Team not found")
        return delay(team)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // POST /teams/{teamId}/add-user
  async addUser(teamId: string, email: string, role: Role): Promise<void> {
    await withMock(
      () =>
        apiFetch<void>(`/teams/${teamId}/add-user`, {
          method: "POST",
          body: { email, role },
        }),
      () => {
        const team = mockTeams.find((t) => t.id === teamId)
        team?.members.push({
          id: `u_${Date.now()}`,
          email,
          name: email.split("@")[0],
          role,
          aiQuotaUsed: 0,
          aiQuotaLimit: 250,
          status: "invited",
          joinedAt: new Date().toISOString(),
        })
        return delay(undefined)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // DELETE /teams/{teamId}/members/{userId}
  async removeUser(teamId: string, userId: string): Promise<void> {
    await withMock(
      () => apiFetch<void>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
      () => {
        const team = mockTeams.find((t) => t.id === teamId)
        if (team) team.members = team.members.filter((m) => m.id !== userId)
        return delay(undefined, 200)
      },
      USE_MOCK_FALLBACK,
    )
  },
}
