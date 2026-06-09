import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { Subscription } from "@/lib/types"
import { mockSubscription } from "@/lib/mock-data"

// -----------------------------------------------------------------------------
// billingService — consumes /billing and integrates Stripe Checkout.
//
// createCheckoutSession calls the Next.js route handler at /api/stripe/checkout
// (same origin) with credentials: "include" so the httpOnly mcp.token cookie
// is forwarded automatically. No Bearer header is needed or sent.
// -----------------------------------------------------------------------------

/**
 * Fetch and cache the current subscription.
 * "use cache" (Next.js 16 Cache Components) means this result is served from
 * the Next.js cache across navigations and hard refreshes, revalidating only
 * when revalidateTag("billing", "max") is called (e.g. after a successful
 * checkout or Stripe webhook). The "max" cacheLife profile enables
 * stale-while-revalidate so the old value is served while the cache warms.
 */
export const billingService = {
  // GET /billing — delegates to the cached server function.
  async getSubscription(): Promise<Subscription> {
    return withMock(
      () => apiFetch<Subscription>("/billing"),
      () => delay(mockSubscription),
      USE_MOCK_FALLBACK,
    )
  },

  /**
   * Create a Stripe Checkout session and return the redirect URL.
   *
   * Calls /api/stripe/checkout on the same Next.js origin — NOT the external
   * backend — so it must not go through apiFetch (which prepends API_BASE_URL).
   * Auth is handled via the httpOnly mcp.token cookie; credentials: "include"
   * forwards it automatically. No token is ever read or sent by client JS.
   */
  async createCheckoutSession(input: {
    plan?: string
    extraQuota?: number
  }): Promise<{ url: string }> {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Checkout request failed (${res.status})`)
    }
    return res.json()
  },
}
