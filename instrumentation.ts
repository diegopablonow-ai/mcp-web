/**
 * Next.js instrumentation hook — runs once when the server process starts.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * Used here for:
 *  1. Environment variable validation — crash fast with a clear error if
 *     required secrets are missing, rather than failing on first request.
 *  2. Production infrastructure checks — Upstash and Sentry must be wired
 *     before the app accepts traffic in production.
 */

export async function register() {
  // Only run environment validation on the Node.js runtime (not the Edge runtime,
  // which runs proxy.ts and doesn't have access to all server-only env vars).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv, validateProductionInfra } = await import("@/lib/env")
    validateEnv()
    validateProductionInfra()
  }
}
