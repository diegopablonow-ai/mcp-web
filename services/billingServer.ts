"use server"

import { cacheTag } from "next/cache"
import { apiFetch, withMock, delay } from "./api"
import { USE_MOCK_FALLBACK } from "@/lib/constants"
import type { Subscription } from "@/lib/types"
import { mockSubscription } from "@/lib/mock-data"

/**
 * Fetch and cache the current subscription for Server Components.
 * Invalidate with revalidateTag("billing", "max") after subscription changes.
 */
export async function fetchSubscription(): Promise<Subscription> {
  "use cache"
  cacheTag("billing")
  return withMock(
    () => apiFetch<Subscription>("/billing"),
    () => delay(mockSubscription),
    USE_MOCK_FALLBACK,
  )
}
