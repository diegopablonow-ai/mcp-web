"use client"

import { useEffect } from "react"
import useSWR from "swr"
import { aiService } from "@/services/aiService"
import type { AIJob } from "@/lib/types"
import { JOB_POLL_INTERVAL } from "@/lib/constants"

// SWR-powered AI jobs hooks with scoped polling and live SSE push.
//
// useAIJobs: subscribes to the SSE stream via aiService.subscribe() and
// calls SWR's mutate() on each push event to keep the cache up-to-date in
// real time. Falls back to polling GET /ai/jobs when the SSE stream is
// unavailable (subscribe() returns a no-op unsubscribe in that case).
// Polling is also scoped: it only runs while at least one job is active
// (queued or running) — when all jobs reach terminal states the interval
// drops to 0, stopping unnecessary background requests.
//
// useAIJob: polls a single job until it reaches a terminal state, then stops.

const ACTIVE_STATUSES = new Set<AIJob["status"]>(["queued", "running"])

function hasActiveJobs(jobs: AIJob[] | undefined): boolean {
  return jobs?.some((j) => ACTIVE_STATUSES.has(j.status)) ?? false
}

export function useAIJobs() {
  const { data, error, isLoading, mutate } = useSWR<AIJob[]>(
    "/ai/jobs",
    () => aiService.list(),
    {
      // Poll as a fallback when SSE is not delivering updates.
      // The function form receives the current cached data so the interval
      // adjusts on each revalidation — 0 when all jobs are terminal.
      refreshInterval: (jobs) => (hasActiveJobs(jobs) ? JOB_POLL_INTERVAL : 0),
      revalidateOnFocus: true,
    },
  )

  // SSE push: subscribe() opens an EventSource to /api/sse/ai-jobs and calls
  // onUpdate with the latest job list on each server-sent event. We call
  // mutate() with the new data so SWR's cache is updated without a refetch.
  // The effect tears down the SSE connection when the component unmounts.
  useEffect(() => {
    const unsubscribe = aiService.subscribe((jobs) => {
      mutate(jobs, { revalidate: false })
    })
    return unsubscribe
  }, [mutate])

  return { jobs: data ?? [], error, isLoading, mutate }
}

export function useAIJob(jobId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<AIJob>(
    jobId ? `/ai/jobs/${jobId}` : null,
    () => aiService.get(jobId as string),
    {
      refreshInterval: (job) => {
        if (!job) return JOB_POLL_INTERVAL
        return ACTIVE_STATUSES.has(job.status) ? JOB_POLL_INTERVAL : 0
      },
    },
  )
  return { job: data ?? null, error, isLoading, mutate }
}
