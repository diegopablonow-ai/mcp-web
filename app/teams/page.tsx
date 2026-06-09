// Server Component — fetchTeams() is a "use cache" async function in
// teamService. Revalidate with revalidateTag("teams", "max") after any
// team mutation (member add/remove, team creation).
import { fetchTeams } from "@/services/teamServer"
import { TeamsView } from "@/components/teams-view"
import { connection } from "next/server"

export default async function TeamsPage() {
  await connection()
  const initialTeams = await fetchTeams()
  return <TeamsView initialTeams={initialTeams} />
}
