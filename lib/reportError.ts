/**
 * Centralised error reporter for both server and client contexts.
 *
 * When SENTRY_DSN is set, exceptions are forwarded to Sentry via
 * @sentry/nextjs (installed as an optional dependency). When it is absent
 * (local dev, CI) the reporter falls back to structured JSON on stderr so
 * logs remain parseable by Vercel Log Drain, Datadog, Axiom, etc.
 *
 * Setup (one-time, already done if sentry.*.config.ts files exist):
 *   pnpm add @sentry/nextjs
 *   npx @sentry/wizard@latest -i nextjs
 *   Set SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT in Vercel project settings.
 */

export interface ErrorContext {
  /** Route or component where the error occurred. */
  source?: string
  /** Additional key/value metadata to attach. */
  [key: string]: unknown
}

function writeStructured(entry: Record<string, unknown>): void {
  if (typeof process !== "undefined" && process.stderr) {
    process.stderr.write(JSON.stringify(entry) + "\n")
  } else {
    console.error(JSON.stringify(entry))
  }
}

/**
 * Report an error to the configured tracking service.
 * Safe to call from both Server Components / Route Handlers and client code.
 */
export function reportError(error: Error, context?: ErrorContext): void {
  // ── Sentry ────────────────────────────────────────────────────────────────
  // Dynamic import keeps this isomorphic and avoids bundling Sentry into
  // chunks that run before the SDK initialises.
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (context) scope.setExtras(context as Record<string, unknown>)
          Sentry.captureException(error)
        })
      })
      .catch(() => {
        // @sentry/nextjs not installed — fall through to structured log below.
        writeStructured({
          level: "error",
          ts: new Date().toISOString(),
          message: error.message,
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
          ...context,
        })
      })
    return
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Structured JSON fallback — used when SENTRY_DSN is not set (dev / CI).
  writeStructured({
    level: "error",
    ts: new Date().toISOString(),
    message: error.message,
    stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    ...context,
  })
}

/**
 * Log a warning (non-fatal). Same destination as reportError.
 */
export function reportWarning(message: string, context?: ErrorContext): void {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (context) scope.setExtras(context as Record<string, unknown>)
          Sentry.captureMessage(message, "warning")
        })
      })
      .catch(() => {
        writeStructured({ level: "warn", ts: new Date().toISOString(), message, ...context })
      })
    return
  }

  writeStructured({ level: "warn", ts: new Date().toISOString(), message, ...context })
}
