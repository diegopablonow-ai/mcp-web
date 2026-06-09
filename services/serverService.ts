import { cacheTag } from "next/cache"
import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { Server, CustomDomain, ServerStatus } from "@/lib/types"
import { mockServers, mockDomains } from "@/lib/mock-data"

// -----------------------------------------------------------------------------
// serverService — consumes /servers, /servers/{serverId}, /custom-domains
//
// Server lifecycle (start / stop / restart) is handled via:
//   PATCH /servers/{serverId}   body: { status: "running" | "stopped" }
//
// NOTE: This endpoint is not yet in the published OpenAPI spec (v1.1.0).
// Tracked in: https://github.com/your-org/mcp-builder/issues/XX
// The mock path mutates in-memory state so the UI works end-to-end today.
// -----------------------------------------------------------------------------

/**
 * Fetch and cache the full server list.
 * "use cache" (Next.js 16 Cache Components) serves this from the Next.js cache
 * across navigations. Invalidate with revalidateTag("servers", "max") after any
 * deploy, status change, or domain mutation.
 */
export async function fetchServers(): Promise<Server[]> {
  "use cache"
  cacheTag("servers")
  return withMock(
    () => apiFetch<Server[]>("/servers"),
    () => delay(mockServers),
    USE_MOCK_FALLBACK,
  )
}

export const serverService = {
  // GET /servers — delegates to the cached server function.
  async list(): Promise<Server[]> {
    return fetchServers()
  },

  // GET /servers/{serverId}
  async get(serverId: string): Promise<Server> {
    return withMock(
      () => apiFetch<Server>(`/servers/${serverId}`),
      () => {
        const server = mockServers.find((s) => s.id === serverId)
        if (!server) throw new Error("Server not found")
        return delay(server)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // PATCH /servers/{serverId}  — lifecycle control (start / stop)
  async setStatus(serverId: string, status: ServerStatus): Promise<Server> {
    return withMock(
      () =>
        apiFetch<Server>(`/servers/${serverId}`, {
          method: "PATCH",
          body: { status },
        }),
      () => {
        const server = mockServers.find((s) => s.id === serverId)
        if (!server) throw new Error(`Server not found: ${serverId}`)
        server.status = status
        return delay(server, 600)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // POST /custom-domains
  async addDomain(domain: string, serverId: string): Promise<CustomDomain> {
    return withMock(
      () =>
        apiFetch<CustomDomain>("/custom-domains", {
          method: "POST",
          body: { domain, serverId },
        }),
      () => {
        const entry: CustomDomain = {
          id: `dom_${Date.now()}`,
          domain,
          serverId,
          status: "pending",
        }
        mockDomains.push(entry)
        const server = mockServers.find((s) => s.id === serverId)
        if (server) server.customDomain = domain
        return delay(entry)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // DELETE /custom-domains/{id}
  async removeDomain(id: string): Promise<void> {
    await withMock(
      () => apiFetch<void>(`/custom-domains/${id}`, { method: "DELETE" }),
      () => {
        const entry = mockDomains.find((d) => d.id === id)
        if (entry) {
          const server = mockServers.find((s) => s.id === entry.serverId)
          if (server) server.customDomain = undefined
        }
        const idx = mockDomains.findIndex((d) => d.id === id)
        if (idx >= 0) mockDomains.splice(idx, 1)
        return delay(undefined)
      },
      USE_MOCK_FALLBACK,
    )
  },

  // GET /custom-domains  (lists all domains for the authenticated user)
  async listDomains(): Promise<CustomDomain[]> {
    return withMock(
      () => apiFetch<CustomDomain[]>("/custom-domains"),
      () => delay([...mockDomains]),
      USE_MOCK_FALLBACK,
    )
  },
}
