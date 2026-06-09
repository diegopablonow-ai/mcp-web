"use client"

import Link from "next/link"
import {
  Users,
  Server as ServerIcon,
  Sparkles,
  Zap,
  ArrowRight,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { UsageChart } from "@/components/usage-chart"
import { TeamCard } from "@/components/team-card"
import { JobCard } from "@/components/job-card"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useAIJobs } from "@/hooks/useAIJobs"
import { useTeams } from "@/hooks/useTeams"
import { useServers } from "@/hooks/useServers"
import { useBilling } from "@/hooks/useBilling"
import { quotaPercent } from "@/lib/helpers"

export function DashboardView() {
  const { user } = useAuth()
  // Use the canonical hooks so SWR cache keys are centralised and all
  // consumers stay in sync — no inline useSWR + service calls here.
  const { teams } = useTeams()
  const { servers } = useServers()
  const { billing } = useBilling()
  const { jobs } = useAIJobs()

  const runningServers = servers.filter((s) => s.status === "running").length
  const activeJobs = jobs.filter(
    (j) => j.status === "running" || j.status === "queued",
  ).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name}` : ""}`}
        description="Overview of your teams, AI jobs, and deployed MCP servers."
      >
        <Link href="/ai-jobs" className={buttonVariants()}>
          <Sparkles className="size-4" />
          New AI job
        </Link>
      </PageHeader>

      {/* Top-line metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Teams"
          value={teams.length || "—"}
          icon={Users}
          hint="Across your workspace"
        />
        <StatCard
          label="Active AI jobs"
          value={activeJobs}
          icon={Sparkles}
          hint={`${jobs.length} total this session`}
          accent="text-chart-1"
        />
        <StatCard
          label="Running servers"
          value={`${runningServers}/${servers.length}`}
          icon={ServerIcon}
          hint="Deployed MCP servers"
          accent="text-chart-3"
        />
        <StatCard
          label="AI quota"
          value={
            billing ? `${quotaPercent(billing.quotaUsed, billing.quota)}%` : "—"
          }
          icon={Zap}
          hint={
            billing
              ? `${billing.quotaUsed?.toLocaleString()} / ${billing.quota.toLocaleString()} used`
              : "Loading"
          }
          accent="text-chart-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UsageChart />
        </div>

        {/* Recent AI jobs */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent AI jobs</CardTitle>
            <Link
              href="/ai-jobs"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {jobs.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))
              : jobs
                  .slice(0, 3)
                  .map((job) => <JobCard key={job.jobId} job={job} />)}
          </CardContent>
        </Card>
      </div>

      {/* Teams overview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">Your teams</h3>
          <Link
            href="/teams"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Manage teams <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.length > 0
            ? teams.map((team) => <TeamCard key={team.id} team={team} />)
            : Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
        </div>
      </section>
    </div>
  )
}
