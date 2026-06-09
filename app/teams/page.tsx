// Server Component — fetchTeams() is a "use cache" async function in
// teamService. Revalidate with revalidateTag("teams", "max") after any
// team mutation (member add/remove, team creation).
import { fetchTeams } from "@/services/teamService"
import { TeamsView } from "@/components/teams-view"

export default async function TeamsPage() {
  const initialTeams = await fetchTeams()
  return <TeamsView initialTeams={initialTeams} />
}
