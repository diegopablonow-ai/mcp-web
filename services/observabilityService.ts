import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { LogEntry } from "@/lib/types"
import { mockLogs } from "@/lib/mock-data"

// -----------------------------------------------------------------------------
// observabilityService — consumes /logs and /health.
//
// subscribe() opens a real SSE connection to /api/sse/logs (a same-origin
// Next.js Route Handler that proxies the backend SSE stream). Auth is handled
// via the mcp.token httpOnly cookie — EventSource sends same-origin cookies
// automatically, so no token query param is needed or used.
//
// If EventSource is unavailable or the connection drops the caller receives
// no further events; ObservabilityView handles this by keeping the last-known
// entries visible. A future improvement would add a polling fallback similar
// to aiService.subscribe().
//
// Mock mode (USE_MOCK_FALLBACK=true) simulates the stream with a local
// interval so the UI works end-to-end without a backend.
// -----------------------------------------------------------------------------

const SSE_ROUTE = "/api/sse/logs"
const SSE_RECONNECT_DELAY_MS = 3000
const mockLogStore = mockLogs()

export const observabilityService = {
  // GET /logs
  async getLogs(): Promise<LogEntry[]> {
    return withMock(
      () => apiFetch<LogEntry[]>("/logs"),
      () => delay(mockLogStore),
      USE_MOCK_FALLBACK,
    )
  },

  // GET /health
  async health(): Promise<{ ok: boolean }> {
    return withMock(
      () => apiFetch<{ ok: boolean }>("/health", { auth: false }),
      () => delay({ ok: true }),
      USE_MOCK_FALLBACK,
    )
  },

  /**
   * Subscribe to real-time log entries.
   *
   * In production (USE_MOCK_FALLBACK=false):
   *   Opens an SSE connection to /api/sse/logs (same-origin Route Handler).
   *   The browser sends the mcp.token httpOnly cookie automatically.
   *   Each `data:` event is expected to be a JSON-encoded LogEntry.
   *   Reconnects automatically after SSE_RECONNECT_DELAY_MS on error/close.
   *
   * In mock mode (USE_MOCK_FALLBACK=true):
   *   Uses a local setInterval to emit synthetic entries so the UI works
   *   without a backend.
   *
   * Returns an unsubscribe function; call it on component unmount.
   */
  subscribe(onLog: (entry: LogEntry) => void): () => void {
    if (USE_MOCK_FALLBACK) {
      return subscribeViaMock(onLog)
    }
    return subscribeViaSSE(onLog)
  },
}

// ---------------------------------------------------------------------------
// SSE path
// ---------------------------------------------------------------------------

function subscribeViaSSE(onLog: (entry: LogEntry) => void): () => void {
  let es: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  function connect() {
    if (cancelled) return
    if (typeof EventSource === "undefined") return // SSR guard

    es = new EventSource(SSE_ROUTE, { withCredentials: true })

    es.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry
        onLog(entry)
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      es?.close()
      es = null
      if (!cancelled) {
        reconnectTimer = setTimeout(connect, SSE_RECONNECT_DELAY_MS)
      }
    }
  }

  connect()

  return () => {
    cancelled = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    es?.close()
  }
}

// ---------------------------------------------------------------------------
// Mock path — synthetic interval, no network
// ---------------------------------------------------------------------------

function subscribeViaMock(onLog: (entry: LogEntry) => void): () => void {
  const sources = ["scheduler", "ai-worker", "deploy", "gateway"]
  const samples = [
    { level: "info" as const, message: "AI job progressed to running" },
    { level: "info" as const, message: "Health probe OK (200)" },
    { level: "warn" as const, message: "Queue depth high on ai-worker" },
    { level: "error" as const, message: "Deploy step failed: timeout" },
  ]
  const interval = setInterval(() => {
    const s = samples[Math.floor(Math.random() * samples.length)]
    onLog({
      id: `log_live_${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: s.level,
      source: sources[Math.floor(Math.random() * sources.length)],
      message: s.message,
    })
  }, 3500)
  return () => clearInterval(interval)
}
