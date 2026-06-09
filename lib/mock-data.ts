import type {
  AIJob,
  CustomDomain,
  LogEntry,
  ProjectFile,
  Server,
  Subscription,
  Team,
} from "./types"

// ---------------------------------------------------------------------------
// Mock dataset — fallback when the live backend is unreachable.
//
// ⚠️  Serverless safety: these arrays are the canonical source of truth.
//     Never mutate them directly (e.g. mockDomains.push(...)). Instead call
//     getMockStore() to get a per-request mutable copy, or implement a
//     module-level Map keyed by some ID for persistent-within-process state.
//
//     In a long-running dev server, module-level mutations DO persist between
//     requests but are lost on each cold start. In serverless (Vercel), each
//     invocation may get a fresh module instance, so mutations appear not to
//     stick. getMockStore() makes this explicit and safe.
// ---------------------------------------------------------------------------

const _mockTeams: Team[] = [
  {
    id: "team_acme",
    name: "Acme Platform",
    plan: "Scale",
    createdAt: "2025-01-12T10:00:00Z",
    members: [
      {
        id: "u_1",
        email: "ada@acme.dev",
        name: "Ada Lovelace",
        role: "admin",
        aiQuotaUsed: 320,
        aiQuotaLimit: 500,
        status: "active",
        joinedAt: "2025-01-12T10:00:00Z",
      },
      {
        id: "u_2",
        email: "linus@acme.dev",
        name: "Linus Carrey",
        role: "member",
        aiQuotaUsed: 140,
        aiQuotaLimit: 250,
        status: "active",
        joinedAt: "2025-02-02T09:00:00Z",
      },
      {
        id: "u_3",
        email: "grace@acme.dev",
        name: "Grace Hopper",
        role: "member",
        aiQuotaUsed: 60,
        aiQuotaLimit: 250,
        status: "invited",
        joinedAt: "2025-03-15T09:00:00Z",
      },
    ],
  },
  {
    id: "team_labs",
    name: "Research Labs",
    plan: "Pro",
    createdAt: "2025-02-20T10:00:00Z",
    members: [
      {
        id: "u_4",
        email: "alan@labs.dev",
        name: "Alan Turing",
        role: "admin",
        aiQuotaUsed: 90,
        aiQuotaLimit: 300,
        status: "active",
        joinedAt: "2025-02-20T10:00:00Z",
      },
    ],
  },
]

function makeMockJobs(): AIJob[] {
  const now = Date.now()
  return [
    {
      jobId: "job_8f2a",
      status: "running",
      createdAt: new Date(now - 1000 * 60 * 2).toISOString(),
      prompt: "Scaffold an MCP server exposing a Postgres query tool",
      teamId: "team_acme",
      progress: 62,
    },
    {
      jobId: "job_7c1b",
      status: "succeeded",
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
      prompt: "Generate a Slack notification MCP tool with retry logic",
      teamId: "team_acme",
      progress: 100,
      durationMs: 48000,
      output: "Created 14 files. Server ready to deploy.",
    },
    {
      jobId: "job_6b0c",
      status: "failed",
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      prompt: "Build a GitHub issue triage MCP server",
      teamId: "team_acme",
      progress: 38,
      output: "Failed: invalid tool schema in generated manifest.",
    },
    {
      jobId: "job_5a9d",
      status: "queued",
      createdAt: new Date(now - 1000 * 30).toISOString(),
      prompt: "Scaffold a Stripe billing MCP server",
      teamId: "team_acme",
      progress: 0,
    },
  ]
}

const _mockSubscription: Subscription = {
  plan: "Scale",
  seats: 10,
  seatsUsed: 6,
  quota: 5000,
  quotaUsed: 2840,
  renewsAt: "2026-07-01T00:00:00Z",
  status: "active",
  amountCents: 24900,
}

const _mockServers: Server[] = [
  {
    id: "srv_001",
    name: "acme-postgres-mcp",
    url: "https://acme-postgres.mcp-builder.app",
    customDomain: "mcp.acme.dev",
    platformDomain: "acme-postgres.mcp-builder.app",
    railwayUrl: "https://acme-postgres.up.railway.app",
    status: "running",
    region: "us-east-1",
    lastDeployedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    teamId: "team_acme",
  },
  {
    id: "srv_002",
    name: "acme-slack-mcp",
    url: "https://acme-slack.mcp-builder.app",
    platformDomain: "acme-slack.mcp-builder.app",
    railwayUrl: "https://acme-slack.up.railway.app",
    status: "stopped",
    region: "eu-west-1",
    lastDeployedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    teamId: "team_acme",
  },
  {
    id: "srv_003",
    name: "labs-triage-mcp",
    url: "https://labs-triage.up.railway.app",
    railwayUrl: "https://labs-triage.up.railway.app",
    status: "deploying",
    region: "us-west-2",
    lastDeployedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    teamId: "team_labs",
  },
]

const _mockDomains: CustomDomain[] = [
  { id: "dom_1", domain: "mcp.acme.dev", serverId: "srv_001", status: "active" },
]

function makeMockLogs(): LogEntry[] {
  const now = Date.now()
  const levels = ["info", "info", "info", "warn", "error", "debug"] as const
  const sources = ["scheduler", "ai-worker", "deploy", "gateway", "billing"]
  const messages = [
    "AI job job_8f2a started on worker-3",
    "Deployment srv_001 healthy (200 OK)",
    "Quota check passed for team_acme",
    "Rate limit warning: ai-worker queue depth 12",
    "Failed to bind custom domain: DNS not propagated",
    "Cache miss for manifest acme-postgres-mcp",
  ]
  return Array.from({ length: 24 }).map((_, i) => {
    const idx = i % messages.length
    return {
      id: `log_${i}`,
      timestamp: new Date(now - i * 1000 * 60 * 3).toISOString(),
      level: levels[idx],
      source: sources[i % sources.length],
      message: messages[idx],
    }
  })
}

export const mockProjectFiles: ProjectFile[] = [
  {
    path: "src/index.ts",
    language: "typescript",
    content: `import { createServer } from "@modelcontextprotocol/sdk/server"
import { queryTool } from "./tools/query"

const server = createServer({ name: "acme-postgres-mcp", version: "1.0.0" })
server.addTool(queryTool)
server.listen().then(() => console.log("MCP server listening"))
`,
  },
  {
    path: "src/tools/query.ts",
    language: "typescript",
    content: `import { z } from "zod"

export const queryTool = {
  name: "pg_query",
  description: "Run a read-only SQL query against the connected Postgres DB",
  inputSchema: z.object({ sql: z.string().describe("A SELECT statement") }),
  async handler({ sql }: { sql: string }) {
    return { rows: [], sql }
  },
}
`,
  },
  {
    path: "package.json",
    language: "json",
    content: `{
  "name": "acme-postgres-mcp",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  }
}
`,
  },
]

// ---------------------------------------------------------------------------
// getMockStore — returns a shallow-cloned, mutable snapshot of all mock data.
//
// Use this instead of referencing the _mock* constants directly when you need
// to mutate (add/remove entries). Each call returns an independent copy so
// mutations don't bleed between requests in a long-running dev server.
// ---------------------------------------------------------------------------

export interface MockStore {
  teams: Team[]
  jobs: AIJob[]
  subscription: Subscription
  servers: Server[]
  domains: CustomDomain[]
  logs: LogEntry[]
}

export function getMockStore(): MockStore {
  return {
    teams: _mockTeams.map((t) => ({ ...t, members: [...t.members] })),
    jobs: makeMockJobs(),
    subscription: { ..._mockSubscription },
    servers: [..._mockServers],
    domains: [..._mockDomains],
    logs: makeMockLogs(),
  }
}

// Read-only convenience exports for components that only read data.
export const mockTeams = _mockTeams
export const mockSubscription = _mockSubscription
export const mockServers = _mockServers
export const mockDomains = _mockDomains
export { makeMockJobs as mockJobs, makeMockLogs as mockLogs }
