import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// GET /api/health
//
// Lightweight liveness probe for load balancers, uptime monitors, and
// Kubernetes readiness checks. Returns 200 while the process is responsive.
//
// Add deeper checks (DB ping, backend reachability) here if needed, but
// keep the default path fast — the goal is confirming the process is alive.
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json(
    { status: "ok", ts: new Date().toISOString() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  )
}
