import { Suspense } from "react"
import { IDE } from "@/components/ide"

export default function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  return (
    <Suspense fallback={null}>
      <EditorContent params={params} />
    </Suspense>
  )
}

async function EditorContent({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  return <IDE projectId={projectId} />
}
