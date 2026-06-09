"use client"

import Link from "next/link"
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useAIJob } from "@/hooks/useAIJobs"
import { jobStatusColor, formatDateTime, cn } from "@/lib/helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

const STATUS_ICON = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
} as const

export function JobDetailView({ jobId }: { jobId: string }) {
  const { job, isLoading } = useAIJob(jobId)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link
        href="/ai-jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All jobs
      </Link>

      {isLoading && !job ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : !job ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Job not found.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-mono text-lg font-semibold">{job.jobId}</h2>
              <p className="text-sm text-muted-foreground">
                Submitted {formatDateTime(job.createdAt)}
              </p>
            </div>
            {(() => {
              const Icon = STATUS_ICON[job.status]
              return (
                <Badge variant="outline" className={cn("gap-1.5", jobStatusColor(job.status))}>
                  <Icon className={cn("size-3.5", job.status === "running" && "animate-spin")} />
                  {job.status}
                </Badge>
              )
            })()}
          </div>

          {(job.status === "running" || job.status === "queued") && (
            <Card>
              <CardContent className="space-y-2 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(job.progress ?? 0)}%</span>
                </div>
                <Progress value={job.progress ?? 0} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {job.prompt ?? "—"}
              </p>
            </CardContent>
          </Card>

          {job.output ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Output</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed text-foreground">
                  {job.output}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
