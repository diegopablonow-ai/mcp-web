"use client"

import { useMemo, useState } from "react"
import { Sparkles, Activity } from "lucide-react"
import { toast } from "sonner"
import { useAIJobs } from "@/hooks/useAIJobs"
import { useTeams } from "@/hooks/useTeams"
import { aiService } from "@/services/aiService"
import type { JobStatus } from "@/lib/types"
import { PageHeader } from "@/components/page-header"
import { JobCard } from "@/components/job-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

const FILTERS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Running", value: "running" },
  { label: "Queued", value: "queued" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
]

export function AIJobsView() {
  const { jobs, isLoading, mutate } = useAIJobs()
  const { teams } = useTeams()

  const [prompt, setPrompt] = useState("")
  const [teamId, setTeamId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<JobStatus | "all">("all")

  // POST /ai/jobs — enqueue a scaffolding job for the selected team.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const team = teamId || teams[0]?.id
    if (!team) {
      toast.error("Select a team first")
      return
    }
    if (!prompt.trim()) return
    setSubmitting(true)
    try {
      const job = await aiService.submit(team, prompt.trim())
      toast.success(`Job ${job.jobId} queued`)
      setPrompt("")
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit job")
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(
    () => (filter === "all" ? jobs : jobs.filter((j) => j.status === filter)),
    [jobs, filter],
  )

  const activeCount = jobs.filter(
    (j) => j.status === "running" || j.status === "queued",
  ).length

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="AI scaffolding jobs"
        description="Submit prompts to generate MCP servers and watch progress update in real time."
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-chart-1/20 bg-chart-1/10 px-2.5 py-1 text-xs font-medium text-chart-1">
          <Activity className="size-3.5" />
          {activeCount} active
        </span>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Submit form */}
        <Card className="lg:sticky lg:top-4 lg:self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              New job
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-team">Team</Label>
                <Select value={teamId} onValueChange={(v) => setTeamId(v ?? "")}>
                  <SelectTrigger id="job-team">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-prompt">Prompt</Label>
                <Textarea
                  id="job-prompt"
                  rows={5}
                  placeholder="Scaffold an MCP server that exposes a Postgres database as read-only tools…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="resize-none"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit job"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live queue */}
        <div className="space-y-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as JobStatus | "all")}>
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              No jobs match this filter.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((job) => (
                <JobCard key={job.jobId} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
