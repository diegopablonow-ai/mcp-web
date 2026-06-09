"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CreditCard, Users, Zap, Check, Loader2, AlertTriangle } from "lucide-react"
import { billingService } from "@/services/billingService"
import { useBilling } from "@/hooks/useBilling"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, cn } from "@/lib/helpers"
import type { Subscription } from "@/lib/types"

const PLANS = [
  { name: "Starter", price: 0, quota: 500, seats: 3, features: ["3 team seats", "500 AI credits / mo", "Community support"] },
  { name: "Scale", price: 249, quota: 5000, seats: 10, features: ["10 team seats", "5,000 AI credits / mo", "Custom domains", "Priority support"], popular: true },
  { name: "Enterprise", price: 999, quota: 25000, seats: 50, features: ["50 team seats", "25,000 AI credits / mo", "SSO & audit logs", "Dedicated support"] },
]

interface BillingViewProps {
  /** Pre-fetched subscription from the server component. Seeds SWR cache so
   *  no loading state is shown on initial render. */
  initialBilling?: Subscription
}

export function BillingView({ initialBilling }: BillingViewProps) {
  // Use the canonical hook — shares cache with DashboardView via SWR key "/billing"
  const { billing: sub, isLoading } = useBilling(initialBilling)
  const [pending, setPending] = useState<string | null>(null)

  // Integration point: redirects to Stripe Checkout via /api/stripe/checkout.
  async function upgrade(plan: string) {
    setPending(plan)
    try {
      const { url } = await billingService.createCheckoutSession({ plan })
      toast.success("Redirecting to secure checkout…")
      window.location.href = url
    } catch {
      toast.error("Could not start checkout. Please try again.")
    } finally {
      setPending(null)
    }
  }

  async function buyQuota() {
    setPending("quota")
    try {
      const { url } = await billingService.createCheckoutSession({ extraQuota: 1000 })
      window.location.href = url
    } catch {
      toast.error("Could not start checkout.")
    } finally {
      setPending(null)
    }
  }

  const quotaUsed = sub?.quotaUsed ?? 0
  const quota = sub?.quota ?? 1
  const quotaPct = Math.min(100, Math.round((quotaUsed / quota) * 100))
  const overQuota = quotaPct >= 90

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Billing & subscription"
        description="Manage your plan, seats, and AI quota."
      />

      {/* Billing alert */}
      {sub?.status === "past_due" && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          Your last payment failed. Update your payment method to avoid service interruption.
        </div>
      )}
      {overQuota && sub?.status !== "past_due" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4" />
          {`You've used ${quotaPct}% of your AI quota this cycle. Consider buying more credits.`}
        </div>
      )}

      {isLoading || !sub ? (
        <Skeleton className="h-44 w-full rounded-xl" />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardDescription>Current plan</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {sub.plan}
                <Badge
                  variant="outline"
                  className={cn(
                    sub.status === "active"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive",
                  )}
                >
                  {sub.status ?? "active"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="text-foreground">
                {sub.amountCents ? `$${(sub.amountCents / 100).toFixed(0)}` : "$0"}
                <span className="text-muted-foreground"> / month</span>
              </p>
              {sub.renewsAt && <p>Renews {formatDate(sub.renewsAt)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Seats</CardDescription>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">
                {sub.seatsUsed ?? 0}
                <span className="text-base font-normal text-muted-foreground"> / {sub.seats}</span>
              </p>
              <Progress value={((sub.seatsUsed ?? 0) / sub.seats) * 100} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>AI quota</CardDescription>
              <Zap className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-semibold">
                {quotaUsed.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}/ {quota.toLocaleString()}
                </span>
              </p>
              <Progress value={quotaPct} className={cn(overQuota && "[&>div]:bg-amber-500")} />
              <Button variant="outline" size="sm" className="w-full" onClick={buyQuota} disabled={pending === "quota"}>
                {pending === "quota" ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                Buy 1,000 credits
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plans */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Available plans</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const current = sub?.plan === plan.name
            return (
              <Card
                key={plan.name}
                className={cn("relative flex flex-col", plan.popular && "border-primary shadow-sm")}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 left-4">Most popular</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-3xl font-semibold">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="flex-1 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="size-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={current ? "outline" : plan.popular ? "default" : "secondary"}
                    disabled={current || pending === plan.name}
                    onClick={() => upgrade(plan.name)}
                  >
                    {pending === plan.name ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CreditCard className="size-4" />
                    )}
                    {current ? "Current plan" : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
