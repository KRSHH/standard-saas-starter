import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import type { SubscriptionStatus } from "@/db/schema";
import { getStripe } from "@/lib/payments/stripe";
import { updateSubscriptionByProviderId } from "@/lib/payments/subscriptions";
import { claimWebhookEvent } from "@/lib/payments/webhook-idempotency";

// Stripe webhook — server-authoritative subscription updates.
// Handles: customer.subscription.{created,updated,deleted}.
export async function POST(request: NextRequest) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted"
  ) {
    return NextResponse.json({ received: true });
  }

  // Stripe event IDs (evt_...) are globally unique — use for idempotency.
  const isNew = await claimWebhookEvent("stripe", event.id, {
    eventType: event.type,
    payload: event,
  });
  if (!isNew) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  const sub = event.data.object;
  // v22: period timestamps live on the first subscription item.
  const primaryItem = sub.items?.data?.[0];
  const periodStart = primaryItem?.current_period_start;
  const periodEnd = primaryItem?.current_period_end;

  const statusMap: Partial<
    Record<Stripe.Subscription.Status, SubscriptionStatus>
  > = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    paused: "paused",
  };

  await updateSubscriptionByProviderId(sub.id, {
    status: statusMap[sub.status] ?? "active",
    currentPeriodStart: periodStart ? new Date(periodStart * 1000) : undefined,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : undefined,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
  });

  return NextResponse.json({ received: true });
}
