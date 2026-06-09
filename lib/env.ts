/**
 * Environment variable validation.
 *
 * Call validateEnv() once at startup (e.g. in instrumentation.ts or
 * at the top of next.config.mjs) to get clear errors for missing secrets
 * before the app starts serving traffic.
 *
 * In Next.js 15+, create instrumentation.ts at the project root and call
 * validateEnv() inside register():
 *
 *   export async function register() {
 *     const { validateEnv } = await import("@/lib/env")
 *     validateEnv()
 *   }
 */

interface EnvVar {
  key: string
  /** If true, missing this var is fatal in production. */
  required: boolean
  /** Human-readable description shown in error messages. */
  description: string
}

const REQUIRED_ENV: EnvVar[] = [
  {
    key: "JWT_SECRET",
    required: true,
    description: "HMAC-SHA256 secret for signing/verifying JWTs (min 32 chars)",
  },
  {
    key: "STRIPE_SECRET_KEY",
    required: true,
    description: "Stripe API secret key (sk_live_* or sk_test_*)",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    required: true,
    description: "Stripe webhook signing secret (whsec_*)",
  },
  {
    key: "STRIPE_PRICE_PRO",
    required: true,
    description: "Stripe Price ID for the Pro plan (price_*)",
  },
  {
    key: "STRIPE_PRICE_SCALE",
    required: true,
    description: "Stripe Price ID for the Scale plan (price_*)",
  },
  {
    key: "STRIPE_PRICE_QUOTA_UNIT",
    required: true,
    description: "Stripe Price ID for per-unit quota top-ups (price_*)",
  },
]

const WARN_ENV: EnvVar[] = [
  {
    key: "UPSTASH_REDIS_REST_URL",
    required: false,
    description:
      "Upstash Redis URL — required for distributed rate limiting and webhook idempotency in production",
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    required: false,
    description: "Upstash Redis token (paired with UPSTASH_REDIS_REST_URL)",
  },
  {
    key: "SENTRY_DSN",
    required: false,
    description: "Sentry DSN — required for production error tracking (Project → Settings → Client Keys)",
  },
  {
    key: "INTERNAL_API_SECRET",
    required: false,
    description: "Shared secret for Next.js → backend service-to-service calls",
  },
  {
    key: "ALLOWED_ORIGIN",
    required: false,
    description: "Allowed CSRF origin in production (defaults to request origin)",
  },
]

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production"
  const errors: string[] = []
  const warnings: string[] = []

  for (const v of REQUIRED_ENV) {
    if (!process.env[v.key]) {
      if (isProd) {
        errors.push(`  ✗ ${v.key} — ${v.description}`)
      } else {
        warnings.push(`  ⚠ ${v.key} — ${v.description}`)
      }
    }
  }

  for (const v of WARN_ENV) {
    if (!process.env[v.key]) {
      warnings.push(`  ⚠ ${v.key} — ${v.description}`)
    }
  }

  if (warnings.length > 0 && !isProd) {
    console.warn(
      `[env] Missing optional/recommended environment variables:\n${warnings.join("\n")}\n` +
        `Copy .env.example to .env.local and fill in the values.`,
    )
  }

  if (errors.length > 0) {
    throw new Error(
      `[env] Missing required environment variables — refusing to start:\n${errors.join("\n")}\n\n` +
        `Set these in your Vercel project settings or .env.local.`,
    )
  }

  if (isProd && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error(
      "[env] JWT_SECRET must be at least 32 characters in production. " +
        `Current length: ${process.env.JWT_SECRET.length}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Production-fatal infrastructure checks (appended by production wiring pass)
// ---------------------------------------------------------------------------

export function validateProductionInfra(): void {
  if (process.env.NODE_ENV !== "production") return

  const missingUpstash =
    !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN
  if (missingUpstash) {
    throw new Error(
      "[env] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must both be set in " +
        "production. Without Upstash, rate limits reset on every cold start and Stripe " +
        "webhook deduplication is process-local only. Create a free database at " +
        "https://upstash.com and add the credentials to your Vercel project settings.",
    )
  }

  if (!process.env.SENTRY_DSN) {
    throw new Error(
      "[env] SENTRY_DSN must be set in production. Without it, unhandled exceptions " +
        "are invisible. Find your DSN in Sentry → Project → Settings → Client Keys " +
        "and add it to your Vercel project settings.",
    )
  }
}
