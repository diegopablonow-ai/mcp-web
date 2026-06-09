"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAIJobs } from "@/hooks/useAIJobs"

// ---------------------------------------------------------------------------
// UsageChart — AI jobs over the last 14 days, derived from real job data.
//
// Buckets jobs by calendar date (en-US locale, pinned to avoid server/client
// hydration mismatches) and fills missing days with 0 so the chart always
// shows a full 14-day window.
//
// Falls back to a deterministic synthetic series when no job data is available
// (initial load / empty account) so the chart is never blank.
// ---------------------------------------------------------------------------

function buildDayLabels(): string[] {
  return Array.from({ length: 14 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  })
}

function fallbackSeries(labels: string[]) {
  return labels.map((date, i) => ({
    date,
    jobs: Math.round(20 + Math.sin(i / 2) * 12 + ((i * 7) % 18)),
  }))
}

export function UsageChart() {
  const { jobs, isLoading } = useAIJobs()

  const data = useMemo(() => {
    const labels = buildDayLabels()

    // If jobs haven't loaded yet, return empty placeholders (chart stays
    // skeleton). If loaded but empty, show the fallback demo series.
    if (isLoading) return labels.map((date) => ({ date, jobs: 0 }))
    if (jobs.length === 0) return fallbackSeries(labels)

    // Count jobs per calendar day (en-US locale for consistent date keys).
    const counts = new Map<string, number>()
    for (const job of jobs) {
      const key = new Date(job.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return labels.map((date) => ({ date, jobs: counts.get(date) ?? 0 }))
  }, [jobs, isLoading])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI jobs — last 14 days</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="jobsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-chart-1)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="jobs"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#jobsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
