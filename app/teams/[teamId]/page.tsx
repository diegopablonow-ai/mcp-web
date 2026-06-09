import { Suspense } from "react"
import { TeamDetailView } from "@/components/team-detail-view"

export default function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  return (
    <Suspense fallback={null}>
      <TeamContent params={params} />
    </Suspense>
  )
}

async function TeamContent({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  return <TeamDetailView teamId={teamId} />
}
