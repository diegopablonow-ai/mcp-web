import { TeamDetailView } from "@/components/team-detail-view"

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  return <TeamDetailView teamId={teamId} />
}
