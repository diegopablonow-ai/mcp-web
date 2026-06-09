/**
 * Type definitions for MCP Builder web app.
 *
 * SPEC DRIFT — tracked in issues #12, #13, #14:
 * The backend OpenAPI spec (v1.0.1) defines minimal schemas for AuthTokens,
 * Team, AIJob, Subscription, and Server. The interfaces below are a superset:
 * fields marked "Not in spec v1.0.1" are returned by the real backend but were
 * omitted from the published spec. Until the spec is updated, treat all such
 * optional fields as potentially absent and always guard with `?.` or `?? fallback`
 * in components — never assume they are present even when the mock data includes them.
 *
 * RESOLUTION PATH:
 * 1. Update docs/backend_api.json to include all fields currently marked
 *    "Not in spec v1.0.1" (coordinate with backend team on issues #12–14).
 * 2. Add OpenAPI → TypeScript codegen to the CI pipeline so this file is
 *    generated rather than hand-maintained:
 *      pnpm add -D openapi-typescript
 *      # In package.json scripts:
 *      "codegen": "openapi-typescript docs/backend_api.json -o lib/types.generated.ts"
 *      # Then re-export from lib/types.ts or replace this file with the generated one.
 * 3. Add a contract test (e.g. using openapi-fetch or zod-openapi) that runs
 *    in CI against a mock server seeded from docs/backend_api.json, so any
 *    future spec divergence fails the pipeline instead of rotting silently.
 *
 * Until steps 1–3 are complete, this file is the source of truth for frontend
 * types. All "Not in spec" comments below serve as the backlog for step 1.
 */

export type Role = "admin" | "member"

export interface AuthTokens {
  token: string
  refreshToken: string
}

export interface User {
  id: string
  email: string
  name?: string
  role: Role
  avatarUrl?: string
  aiQuotaUsed?: number
  aiQuotaLimit?: number
}

export interface TeamMember {
  id: string
  email: string
  name?: string
  role: Role
  aiQuotaUsed: number
  aiQuotaLimit: number
  status: "active" | "invited"
  joinedAt: string
}

export interface Team {
  id: string
  name: string
  members: TeamMember[]
  plan?: string
  createdAt?: string
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed"

export interface AIJob {
  jobId: string
  status: JobStatus
  createdAt: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  prompt?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  teamId?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  progress?: number
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  durationMs?: number
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  output?: string
}

export interface Subscription {
  plan: string
  seats: number
  quota: number
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  seatsUsed?: number
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  quotaUsed?: number
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  renewsAt?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  status?: "active" | "past_due" | "canceled"
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  amountCents?: number
}

export type ServerStatus = "running" | "stopped" | "deploying" | "error"

export interface CustomDomain {
  id: string
  domain: string
  serverId: string
  status: "active" | "pending" | "error"
}

export interface Server {
  id: string
  url: string
  customDomain?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  name?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  platformDomain?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  railwayUrl?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  status?: ServerStatus
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  region?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  lastDeployedAt?: string
  /** Not in spec v1.0.1 — returned by backend, pending spec update */
  teamId?: string
}

export interface LogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  source: string
  message: string
}

export interface ProjectFile {
  path: string
  content: string
  language: string
}
