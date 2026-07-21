import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import type { SubscriptionStatus } from "@/db/schema";
import { getStripe } from "@/lib/payments/stripe";
import { updateSubscriptionByProviderId } from "@/lib/payments/subscriptions";
import { claimWebhookEvent } from "@/lib/payments/webhook-idempotency";
import { requireEnv } from "@/lib/env";

/**
 * Stripe webhook — server-authoritative subscription updates.
 * Configure in Stripe dashboard → Developers → Webhooks.
 *
 * NOTE on Stripe v22 (acacia API, 2025-09-24):
 *   - `current_period_start/end` moved from Subscription to SubscriptionItem.
 *     We read them from `sub.items.data[0]` (the primary item).
 *   - `invoice.subscription` was removed in favor of `invoice.parent`
 *     (polymorphic). Rather than chase it, we rely on the three
 *     `customer.subscription.*` events which already cover every lifecycle
 *     transition we care about (created/updated/deleted).
 *
 * Events handled:
 *   - customer.subscription.created   → trialing
 *   - customer.subscription.updated   → active / past_due / paused
 *   - customer.subscription.deleted   → canceled
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();
  const webhookSecret = requireEnv(
    "STRIPE_WEBHOOK_SECRET",
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
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

  // Idempotency: Stripe event IDs (evt_...) are globally unique.
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
