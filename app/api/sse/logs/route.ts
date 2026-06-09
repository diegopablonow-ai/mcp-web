import { NextRequest } from "next/server"
import { verifyNextRequestCookie } from "@/lib/jwt"

// ---------------------------------------------------------------------------
// GET /api/sse/logs
//
// Same-origin SSE proxy for the backend log stream. Mirrors /api/sse/ai-jobs.
// A 5-minute AbortController timeout prevents silent upstream hangs from
// leaking connections indefinitely.
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mcp-builder.com"
const SSE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export async function GET(req: NextRequest) {
  // 1. Verify the session from the httpOnly cookie.
  const { valid } = await verifyNextRequestCookie(req)
  if (!valid) {
    return new Response("Unauthorized", { status: 401 })
  }

  const token = req.cookies.get("mcp.token")?.value

  // 2. Open the upstream SSE connection with a timeout.
  const abort = new AbortController()
  const timeoutId = setTimeout(() => abort.abort(), SSE_TIMEOUT_MS)

  let upstream: Response
  try {
    upstream = await fetch(`${API_BASE_URL}/logs/stream`, {
      signal: abort.signal,
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    clearTimeout(timeoutId)
    return new Response("SSE upstream unreachable", { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeoutId)
    return new Response("SSE upstream error", { status: 502 })
  }

  // 3. Pipe through and clear the timeout when the stream closes.
  const { readable, writable } = new TransformStream()
  upstream.body
    .pipeTo(writable)
    .finally(() => clearTimeout(timeoutId))
    .catch(() => {/* client disconnect */})

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
