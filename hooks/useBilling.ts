"use client"

import useSWR from "swr"
import { billingService } from "@/services/billingService"
import type { Subscription } from "@/lib/types"

// SWR-powered hook for billing / subscription data.
// Centralises the cache key so DashboardView and BillingView share one request.
//
// The optional `initialData` parameter accepts pre-fetched data from a server
// component (via fetchSubscription()). Passing it sets SWR's `fallbackData`
// so the hook returns real data immediately — no loading state on first render.

export function useBilling(initialData?: Subscription) {
  const { data, error, isLoading, mutate } = useSWR<Subscription>(
    "/billing",
    () => billingService.getSubscription(),
    { fallbackData: initialData },
  )
  return { billing: data ?? null, error, isLoading, mutate }
}
