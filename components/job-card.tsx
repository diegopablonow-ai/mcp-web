// Server Component — no hooks, pure JSX from props.
import Link from "next/link"
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { jobStatusColor, relativeTime } from "@/lib/helpers"
import type { AIJob } from "@/lib/types"

const STATUS_ICON = {
  queued: Clock,
  running: Loader2,
  succeeded: CheckCircle2,
  failed: XCircle,
} as const

export function JobCard({ job }: { job: AIJob }) {
  const Icon = STATUS_ICON[job.status]
  return (
    <Link href={`/ai-jobs/${job.jobId}`} className="block">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-sm font-medium leading-snug">
              {job.prompt ?? job.jobId}
            </p>
            <Badge
              variant="outline"
              className={cn("shrink-0 gap-1", jobStatusColor(job.status))}
            >
              <Icon
                className={cn("size-3", job.status === "running" && "animate-spin")}
              />
              {job.status}
            </Badge>
          </div>

          {(job.status === "running" || job.status === "queued") && (
            <Progress value={job.progress ?? 0} className="h-1.5" />
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">{job.jobId}</span>
            <span>{relativeTime(job.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
