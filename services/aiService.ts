import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { AIJob } from "@/lib/types"
import { mockJobs } from "@/lib/mock-data"

// -----------------------------------------------------------------------------
// aiService — consumes POST /ai/jobs, GET /ai/jobs, GET /ai/jobs/{jobId}
//
// subscribe() connects to a real SSE stream at GET /api/sse/ai-jobs (a
// same-origin Next.js Route Handler) when the backend is reachable. Routing
// through a Route Handler means the browser sends the mcp.token httpOnly cookie
// automatically — no token query param needed or used.
//
// If EventSource is unavailable or the connection drops, it falls back to
// polling GET /ai/jobs every POLL_INTERVAL_MS ms.
// Mock mode (USE_MOCK_FALLBACK) advances in-memory job state on an interval
// and never touches the network.
// -----------------------------------------------------------------------------

// Same-origin Route Handler that proxies to the backend SSE endpoint.
// Auth is handled via the mcp.token httpOnly cookie — EventSource sends
// same-origin cookies automatically, no token query param required.
const SSE_ROUTE = "/api/sse/ai-jobs"
const POLL_INTERVAL_MS = 2500
const SSE_RECONNECT_DELAY_MS = 3000

export const aiService = {
  // POST /ai/jobs
  async submit(teamId: string, prompt: string): Promise<AIJob> {
    return withMock(
      () =>
        apiFetch<AIJob>("/ai/jobs", {
          method: "POST",
          body: { teamId, prompt },
        }),
      () => {
        const job: AIJob = {
          jobId: `job_${Math.random().toString(36).slice(2, 6)}`,
          status: "queued",
          createdAt: new Date().toISOString(),
          prompt,
          teamId,
          progress: 0,
        }
        mockJobs.unshift(job)
        return delay(job)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // GET /ai/jobs
  async list(): Promise<AIJob[]> {
    return withMock(
      () => apiFetch<AIJob[]>("/ai/jobs"),
      () => delay([...mockJobs]),
      USE_MOCK_FALLBACK,
    )
  },

  // GET /ai/jobs/{jobId}
  async get(jobId: string): Promise<AIJob> {
    return withMock(
      () => apiFetch<AIJob>(`/ai/jobs/${jobId}`),
      () => {
        const job = mockJobs.find((j) => j.jobId === jobId)
        if (!job) throw new Error("Job not found")
        return delay(job)
      },
      USE_MOCK_FALLBACK,
    )
  },

  /**
   * Subscribe to real-time job updates.
   *
   * In production (USE_MOCK_FALLBACK=false):
   *   1. Opens an SSE connection to /api/sse/ai-jobs (same-origin Route Handler).
   *      The browser sends the mcp.token httpOnly cookie automatically.
   *      The Route Handler verifies the cookie and proxies the backend SSE stream.
   *   2. If SSE is unavailable or the connection closes unexpectedly, falls
   *      back to polling GET /ai/jobs every POLL_INTERVAL_MS ms.
   *
   * In mock mode (USE_MOCK_FALLBACK=true):
   *   Advances the in-memory mockJobs store on an interval — no network calls.
   *
   * Returns an unsubscribe function. Safe to call multiple times — each call
   * gets its own isolated connection/interval that is cleaned up on unsubscribe.
   */
  subscribe(onUpdate: (jobs: AIJob[]) => void): () => void {
    if (USE_MOCK_FALLBACK) {
      return subscribeMock(onUpdate)
    }
    return subscribeSSE(onUpdate)
  },
}

// ---------------------------------------------------------------------------
// SSE + polling fallback
// ---------------------------------------------------------------------------

function subscribeSSE(onUpdate: (jobs: AIJob[]) => void): () => void {
  let active = true
  let es: EventSource | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function clearTimers() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  function startPolling() {
    if (!active) return
    const poll = async () => {
      if (!active) return
      try {
        const jobs = await apiFetch<AIJob[]>("/ai/jobs")
        if (active) onUpdate(jobs)
      } catch {
        // Silently swallow — next tick will retry.
      }
      if (active) pollTimer = setTimeout(poll, POLL_INTERVAL_MS)
    }
    poll()
  }

  function connect() {
    if (!active) return
    // Route through the same-origin /api/sse/ai-jobs Route Handler so the
    // browser sends the mcp.token httpOnly cookie automatically. EventSource
    // sends credentials for same-origin URLs by default in all modern browsers.
    try {
      es = new EventSource(SSE_ROUTE)
    } catch {
      // EventSource constructor can throw in some environments (e.g. Node).
      startPolling()
      return
    }

    es.onmessage = (event) => {
      if (!active) return
      try {
        const jobs: AIJob[] = JSON.parse(event.data)
        onUpdate(jobs)
      } catch {
        // Malformed event — ignore.
      }
    }

    es.onerror = () => {
      if (!active) return
      es?.close()
      es = null
      // Retry SSE after a short delay; if it fails again, fall back to polling.
      reconnectTimer = setTimeout(() => {
        if (!active) return
        try {
          connect()
        } catch {
          startPolling()
        }
      }, SSE_RECONNECT_DELAY_MS)
    }

    // SSE connection closed cleanly by the server — fall back to polling.
    es.addEventListener("close", () => {
      if (!active) return
      es = null
      startPolling()
    })
  }

  connect()

  return () => {
    active = false
    clearTimers()
    es?.close()
    es = null
  }
}

// ---------------------------------------------------------------------------
// Mock subscription — advances in-memory state, no network
// ---------------------------------------------------------------------------

function subscribeMock(onUpdate: (jobs: AIJob[]) => void): () => void {
  let active = true

  const tick = () => {
    if (!active) return
    for (const job of mockJobs) {
      if (job.status === "queued") {
        job.status = "running"
        job.progress = 5
      } else if (job.status === "running") {
        job.progress = Math.min(100, (job.progress ?? 0) + Math.random() * 18)
        if ((job.progress ?? 0) >= 100) {
          job.status = "succeeded"
          job.progress = 100
          job.durationMs = 40000 + Math.floor(Math.random() * 20000)
          job.output = "Scaffolding complete. Server ready to deploy."
        }
      }
    }
    onUpdate([...mockJobs])
  }

  const interval = setInterval(tick, 2000)
  tick() // Fire immediately without waiting for first tick.

  return () => {
    active = false
    clearInterval(interval)
  }
}
