/**
 * Idempotency store for Stripe webhook event IDs.
 *
 * Production (UPSTASH_REDIS_REST_URL set): uses Redis SET NX with a 24-hour
 * TTL — safe across all instances and cold starts.
 *
 * Development / fallback: in-memory Map — resets on cold start but still
 * prevents double-processing within the same process lifetime.
 *
 * Returns true if this event should be processed (first time seen),
 * false if it's a duplicate and should be acknowledged without action.
 */

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

const memSeen = new Map<string, number>()
const MEM_TTL_MS = 24 * 60 * 60 * 1000

function pruneMemSeen() {
  const cutoff = Date.now() - MEM_TTL_MS
  for (const [id, ts] of memSeen) {
    if (ts < cutoff) memSeen.delete(id)
  }
}

function markMemory(eventId: string): boolean {
  pruneMemSeen()
  if (memSeen.has(eventId)) return false
  memSeen.set(eventId, Date.now())
  return true
}

// ---------------------------------------------------------------------------
// Upstash Redis backend
// ---------------------------------------------------------------------------

async function markUpstash(eventId: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!

  // SET key value NX EX ttl — only succeeds if key doesn't exist
  const res = await fetch(
    `${url}/set/stripe:event:${encodeURIComponent(eventId)}/1/NX/EX/86400`,
    {
      method: "GET", // Upstash REST uses GET for simple commands
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!res.ok) {
    console.warn("[webhookIdempotency] Upstash request failed, failing open:", res.status)
    // Fail open — process the event rather than silently drop it.
    // Downstream handlers must remain idempotent in this case.
    return true
  }

  const data = (await res.json()) as { result: string | null }
  // SET NX returns "OK" on first write, null if key already existed.
  return data.result === "OK"
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mark an event as processed.
 * Returns true if this is the first time (process it).
 * Returns false if it's a duplicate (skip it).
 */
export async function markProcessed(eventId: string): Promise<boolean> {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return markUpstash(eventId)
  }
  return markMemory(eventId)
}
