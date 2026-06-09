import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { markProcessed } from "@/lib/webhookIdempotency"
import { logger } from "@/lib/logger"
import { reportError } from "@/lib/reportError"

interface StripeEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}

async function verifyStripeSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(signature.split(",").map((p) => p.split("=")))
  const timestamp = parts["t"]
  const v1 = parts["v1"]
  if (!timestamp || !v1) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (age > 300) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${rawBody}`))
  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  return computed === v1
}

const BACKEND_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.mcp-builder.com"

async function backendPatch(path: string, body: Record<string, unknown>): Promise<void> {
  const secret = process.env.INTERNAL_API_SECRET
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "X-Internal-Secret": secret } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Backend PATCH ${path} failed (${res.status}): ${text}`)
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.error({ source: "stripe/webhook" }, "STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 })
  }

  const rawBody = await req.text()

  if (!signature || !(await verifyStripeSignature(rawBody, signature, webhookSecret))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  let event: StripeEvent
  try {
    event = JSON.parse(rawBody) as StripeEvent
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (!(await markProcessed(event.id))) {
    logger.info({ source: "stripe/webhook", eventId: event.id }, "Duplicate event ignored")
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const userId = session["client_reference_id"] as string | undefined
        const subscriptionId = session["subscription"] as string | undefined
        const customerId = session["customer"] as string | undefined

        if (!userId) {
          logger.warn(
            { source: "stripe/webhook", eventId: event.id },
            "checkout.session.completed missing client_reference_id",
          )
          break
        }

        logger.info(
          { source: "stripe/webhook", userId, subscriptionId },
          "Checkout completed",
        )
        await backendPatch(`/users/${userId}/subscription`, {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          status: "active",
          stripeEventId: event.id,
        })
        revalidateTag("billing")
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object
        const customerId = sub["customer"] as string
        const status = sub["status"] as string
        const planId = (sub["items"] as { data: { price: { id: string } }[] } | undefined)
          ?.data?.[0]?.price?.id

        logger.info(
          { source: "stripe/webhook", customerId, status },
          "Subscription updated",
        )
        await backendPatch(`/billing/by-customer/${customerId}`, {
          status,
          stripePriceId: planId,
          stripeEventId: event.id,
        })
        revalidateTag("billing")
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object
        const customerId = sub["customer"] as string

        logger.info({ source: "stripe/webhook", customerId }, "Subscription cancelled")
        await backendPatch(`/billing/by-customer/${customerId}`, {
          status: "canceled",
          plan: "Starter",
          stripeEventId: event.id,
        })
        revalidateTag("billing")
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object
        const customerId = invoice["customer"] as string
        const attemptCount = invoice["attempt_count"] as number | undefined

        logger.warn(
          { source: "stripe/webhook", customerId, attemptCount },
          "Payment failed",
        )
        await backendPatch(`/billing/by-customer/${customerId}`, {
          status: "past_due",
          stripeEventId: event.id,
        })
        revalidateTag("billing")
        break
      }

      default:
        logger.info(
          { source: "stripe/webhook", eventType: event.type },
          "Unhandled event type",
        )
        break
    }
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      source: "stripe/webhook",
      eventId: event.id,
      eventType: event.type,
    })
    return NextResponse.json({ error: "Internal handler error." }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
