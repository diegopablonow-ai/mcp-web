/**
 * Structured server-side logger.
 *
 * Emits newline-delimited JSON to stderr so logs are:
 *  - Parseable by Vercel Log Drain, Datadog, Axiom, etc.
 *  - Never silently swallowed in production.
 *  - Searchable by field (level, source, traceId, etc.)
 *
 * ─── To upgrade to Pino ───────────────────────────────────────────────────
 * pnpm add pino
 * Replace the implementation below with:
 *   import pino from "pino"
 *   export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" })
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info({ source: "stripe/webhook", eventId }, "Checkout completed")
 *   logger.error({ source: "sse/ai-jobs", err }, "Upstream unreachable")
 */

type Level = "debug" | "info" | "warn" | "error"

const LEVEL_RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function activeLevel(): Level {
  const env = process.env.LOG_LEVEL ?? "info"
  return (env as Level) in LEVEL_RANK ? (env as Level) : "info"
}

function emit(level: Level, context: Record<string, unknown>, message: string) {
  if (LEVEL_RANK[level] < LEVEL_RANK[activeLevel()]) return
  const entry = JSON.stringify({
    level,
    ts: new Date().toISOString(),
    message,
    ...context,
  })
  process.stderr.write(entry + "\n")
}

export const logger = {
  debug: (ctx: Record<string, unknown>, msg: string) => emit("debug", ctx, msg),
  info:  (ctx: Record<string, unknown>, msg: string) => emit("info",  ctx, msg),
  warn:  (ctx: Record<string, unknown>, msg: string) => emit("warn",  ctx, msg),
  error: (ctx: Record<string, unknown>, msg: string) => emit("error", ctx, msg),
}
