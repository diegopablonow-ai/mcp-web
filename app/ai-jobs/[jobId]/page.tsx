import { Suspense } from "react"
import { JobDetailView } from "@/components/job-detail-view"

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  return (
    <Suspense fallback={null}>
      <JobDetailContent params={params} />
    </Suspense>
  )
}

async function JobDetailContent({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  return <JobDetailView jobId={jobId} />
}
