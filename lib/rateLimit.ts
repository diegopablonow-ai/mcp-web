/**
 * Rate limiter with two backends:
 *
 * 1. Upstash Redis (production) — distributed, survives cold starts, works
 *    across all Vercel instances. Requires UPSTASH_REDIS_REST_URL and
 *    UPSTASH_REDIS_REST_TOKEN env vars. Install: pnpm add @upstash/redis
 *
 * 2. In-memory (dev / fallback) — module-level Map, resets on cold start.
 *    Fine for local dev; not suitable for multi-instance production.
 *
 * The backend is selected automatically:
 *   - UPSTASH_REDIS_REST_URL is set → Upstash
 *   - Otherwise → in-memory
 *
 * Usage:
 *   const rl = await checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
 *   if (!rl.allowed) return 429
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number // Unix ms
}

// ---------------------------------------------------------------------------
// In-memory backend
// ---------------------------------------------------------------------------

interface MemEntry {
  count: number
  resetAt: number
}

const memStore = new Map<string, MemEntry>()

function pruneMemStore() {
  const now = Date.now()
  for (const [k, v] of memStore) {
    if (v.resetAt < now) memStore.delete(k)
  }
}

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  pruneMemStore()
  const now = Date.now()
  let entry = memStore.get(key)
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + windowMs }
    memStore.set(key, entry)
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt }
  }
  entry.count += 1
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis backend (optional dependency)
// ---------------------------------------------------------------------------

async function checkUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!
  const windowSecs = Math.ceil(windowMs / 1000)

  // INCR + EXPIRE in a pipeline to minimise round-trips.
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSecs, "NX"], // only set expiry on first write
    ]),
  })

  if (!res.ok) {
    // Redis unreachable — fail open with a warning rather than blocking users.
    console.warn("[rateLimit] Upstash request failed, failing open:", res.status)
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs }
  }

  const data = (await res.json()) as [[string, number], [string, number]]
  const count = data[0][1]
  const resetAt = Date.now() + windowMs // approximate; EXPIRE sets from now

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether `key` is within `limit` requests per `windowMs`.
 * Automatically picks the Upstash backend when env vars are present.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return checkUpstash(key, limit, windowMs)
  }
  return checkMemory(key, limit, windowMs)
}

/**
 * Extract the best available client IP from a Next.js / Edge Request.
 */
export function getClientIp(req: Request): string {
  return (
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}
