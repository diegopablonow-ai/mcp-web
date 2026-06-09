import { NextRequest, NextResponse } from "next/server"
import { verifyNextRequestCookie } from "@/lib/jwt"
import { CheckoutBodySchema } from "@/lib/validation"

// ---------------------------------------------------------------------------
// POST /api/stripe/checkout
//
// Creates a Stripe Checkout session for plan upgrades or quota top-ups.
// ---------------------------------------------------------------------------

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? "",
  scale: process.env.STRIPE_PRICE_SCALE ?? "",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE ?? "",
}

export async function POST(req: NextRequest) {
  // 1. Verify session.
  const { valid, user } = await verifyNextRequestCookie(req)
  if (!valid || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse and validate request body.
  const raw = await req.json().catch(() => ({}))
  const parsed = CheckoutBodySchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid request."
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const body = parsed.data
  const origin = new URL(req.url).origin

  // 3. Mock fallback — no Stripe key configured.
  if (!process.env.STRIPE_SECRET_KEY) {
    const label = body.extraQuota ? `quota-${body.extraQuota}` : (body.plan ?? "upgrade")
    return NextResponse.json({
      url: `${origin}/billing?checkout=mock&item=${encodeURIComponent(label)}`,
    })
  }

  // 4. Real Stripe Checkout session.
  const Stripe = (await import("stripe")).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const planKey = body.plan?.toLowerCase()
    const priceId = planKey ? PRICE_IDS[planKey] : undefined

    if (!priceId && !body.extraQuota) {
      return NextResponse.json({ error: "Invalid plan or quota." }, { status: 400 })
    }

    if (priceId && !priceId.startsWith("price_")) {
      return NextResponse.json(
        { error: `Price ID for plan "${body.plan}" is not configured.` },
        { status: 500 },
      )
    }

    // Guard STRIPE_PRICE_QUOTA_UNIT explicitly — the `!` non-null assertion
    // was removed because a missing env var silently sends `undefined` to
    // Stripe, producing an opaque error instead of a useful one.
    if (body.extraQuota !== undefined) {
      const quotaPriceId = process.env.STRIPE_PRICE_QUOTA_UNIT
      if (!quotaPriceId || !quotaPriceId.startsWith("price_")) {
        console.error("[stripe/checkout] STRIPE_PRICE_QUOTA_UNIT is missing or invalid.")
        return NextResponse.json(
          { error: "Quota pricing is not configured. Contact support." },
          { status: 500 },
        )
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: user.id,
        customer_email: user.email,
        line_items: [{ price: quotaPriceId, quantity: body.extraQuota }],
        success_url: `${origin}/billing?status=success`,
        cancel_url: `${origin}/billing?status=cancelled`,
      })
      return NextResponse.json({ url: session.url })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer_email: user.email,
      line_items: [{ price: priceId!, quantity: 1 }],
      success_url: `${origin}/billing?status=success`,
      cancel_url: `${origin}/billing?status=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error("[stripe/checkout] Session creation failed:", err)
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 502 })
  }
}
