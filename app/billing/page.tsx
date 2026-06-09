// Server Component — fetchSubscription() is a "use cache" async function in
// billingService. The result is served from the Next.js cache and revalidated
// when revalidateTag("billing", "max") is called (e.g. from the Stripe
// webhook handler after a subscription change).
import { fetchSubscription } from "@/services/billingServer"
import { BillingView } from "@/components/billing-view"

export default async function BillingPage() {
  const initialBilling = await fetchSubscription()
  return <BillingView initialBilling={initialBilling} />
}
