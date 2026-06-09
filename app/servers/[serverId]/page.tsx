import { Suspense } from "react"
import { ServerDetailView } from "@/components/server-detail-view"

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  return (
    <Suspense fallback={null}>
      <ServerDetailContent params={params} />
    </Suspense>
  )
}

async function ServerDetailContent({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params
  return <ServerDetailView serverId={serverId} />
}
