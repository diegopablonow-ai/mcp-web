import { ServerDetailView } from "@/components/server-detail-view"

export default async function ServerDetailPage({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params
  return <ServerDetailView serverId={serverId} />
}
