import { IDE } from "@/components/ide"

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  return <IDE projectId={projectId} />
}
