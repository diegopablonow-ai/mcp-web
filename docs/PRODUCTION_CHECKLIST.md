# Production Readiness Checklist

Work through this before going live. Each item links to the relevant file.

## Before first deploy

### Security
- [ ] `JWT_SECRET` — set to ≥ 32 random chars in Vercel env vars
- [ ] `STRIPE_SECRET_KEY` — use `sk_live_*` key (not test)
- [ ] `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Webhooks
- [ ] All `STRIPE_PRICE_*` vars — real `price_*` IDs from your Stripe products
- [ ] `INTERNAL_API_SECRET` — shared secret between this app and your backend
- [ ] `ALLOWED_ORIGIN` — your production domain (e.g. `https://app.mcp-builder.com`)

### Distributed rate limiting (Upstash)
Without this, rate limits reset on every cold start (ineffective on Vercel).
- [ ] Create an Upstash Redis database at https://upstash.com
- [ ] Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel
- [ ] Verify: `lib/rateLimit.ts` will auto-switch to Upstash when vars are present

### Webhook idempotency (Upstash)
Without this, duplicate Stripe events can fire backend mutations twice.
- [ ] Same Upstash instance as above — no extra config needed
- [ ] Verify: `lib/webhookIdempotency.ts` uses Redis SET NX when vars are present

### Error tracking (Sentry)
Without this you have no visibility into production crashes.
- [ ] `pnpm add @sentry/nextjs`
- [ ] `npx @sentry/wizard@latest -i nextjs`
- [ ] Set `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel
- [ ] Uncomment the Sentry block in `lib/reportError.ts`

## Operational

### Logging
- [ ] Set `LOG_LEVEL=info` (or `warn`) in Vercel production env
- [ ] (Optional) Connect a Log Drain in Vercel → Integrations for persistent log storage
- [ ] Structured JSON logs from `lib/logger.ts` are already parseable by Datadog, Axiom, etc.

### Monitoring
- [ ] Point your uptime monitor at `/api/health` (returns `{status: "ok"}`)
- [ ] Set alert threshold: > 1% 5xx rate, > 2s p99 latency

### CI/CD
- [ ] `.github/workflows/ci.yml` — typecheck + lint + **test** + build on every PR
- [ ] Vercel Preview Deployments — enabled by default on PR branches
- [ ] Branch protection: require CI to pass before merging to `main`

## Two-step optional upgrades

### Sessions (force-logout support)
Currently stateless JWT only — no way to invalidate a specific user's session.
To add this:
1. Store `jti` (JWT ID) claims in Redis with a user → set mapping
2. On forced logout, delete the user's jti set entry
3. In `proxy.ts` / `lib/jwt.ts`, reject tokens whose `jti` is no longer in the set

### Pino structured logging
`lib/logger.ts` is Pino-compatible. To upgrade:
1. `pnpm add pino pino-pretty`
2. Replace the `emit` function body with `pino({ level: process.env.LOG_LEVEL ?? "info" })`

### OpenAPI contract testing (resolves spec drift in lib/types.ts)
`lib/types.ts` tracks fields that diverge from the published backend spec v1.0.1
(issues #12, #13, #14). To prevent future drift:
1. Update `docs/backend_api.json` with all fields currently marked "Not in spec v1.0.1"
2. Add codegen to `package.json`:
   ```
   "codegen": "openapi-typescript docs/backend_api.json -o lib/types.generated.ts"
   ```
3. Add a CI step: `pnpm codegen && git diff --exit-code lib/types.generated.ts`
   (fails the pipeline if the spec and generated types diverge)
4. See `docs/adr-001-auth-layers.md` for the related JWT simplification opportunity

### JWT verification consolidation (proxy.ts + lib/jwt.ts)
Now that `proxy.ts` runs on the Node.js runtime in Next.js 16, the duplicate
Web Crypto `verifySignature()` in `proxy.ts` and `verifyJwt()` in `lib/jwt.ts`
can be merged into a single shared helper, eliminating the "mirror changes in
both files" maintenance hazard. See `docs/adr-001-auth-layers.md`.

