import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { verifyRazorpayWebhook } from "@/lib/payments/razorpay";
import { updateSubscriptionByProviderId } from "@/lib/payments/subscriptions";
import { claimWebhookEvent } from "@/lib/payments/webhook-idempotency";

/**
 * Razorpay webhook — server-authoritative subscription updates.
 * Configure in Razorpay dashboard: https://dashboard.razorpay.com/app/webhooks
 *
 * Events we handle (docs/09 §lifecycle):
 *   - subscription.activated   → active
 *   - subscription.charged     → active (payment success)
 *   - subscription.pending     → past_due
 *   - subscription.halted      → past_due (retries exhausted)
 *   - subscription.cancelled   → canceled
 *
 * IMPORTANT: read the raw body BEFORE parsing. Signature is over raw bytes.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed: unknown = JSON.parse(rawBody);
  const result = razorpayWebhookSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const event = result.data;
  const sub = event.payload?.subscription?.entity;
  const payment = event.payload?.payment?.entity;

  // Idempotency: Razorpay event IDs are unique per delivery intent.
  // Use the account_id + event id composite (Razorpay doesn't always set a
  // top-level id, so derive one from the entity id + type).
  const eventId =
    event.note?.webhook_id ??
    `${event.event}:${sub?.id ?? ""}:${payment?.id ?? ""}`;
  const isNew = await claimWebhookEvent("razorpay", eventId, {
    eventType: event.event,
    payload: event,
  });
  if (!isNew) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  if (!sub?.id) {
    // Not a subscription event — acknowledge so Razorpay stops retrying.
    return NextResponse.json({ received: true });
  }

  const statusMap: Record<string, "active" | "past_due" | "canceled"> = {
    "subscription.activated": "active",
    "subscription.charged": "active",
    "subscription.pending": "past_due",
    "subscription.halted": "past_due",
    "subscription.cancelled": "canceled",
  };

  const nextStatus = statusMap[event.event];
  if (!nextStatus) {
    return NextResponse.json({ received: true });
  }

  await updateSubscriptionByProviderId(sub.id, {
    status: nextStatus,
    providerPaymentId: payment?.id,
    currentPeriodStart: sub.start_at
      ? new Date(sub.start_at * 1000)
      : undefined,
    currentPeriodEnd: sub.end_at ? new Date(sub.end_at * 1000) : undefined,
    canceledAt: nextStatus === "canceled" ? new Date() : undefined,
    metadata: event,
  });

  return NextResponse.json({ received: true });
}

const razorpayWebhookSchema = z.object({
  event: z.string(),
  note: z.object({ webhook_id: z.string().optional() }).optional(),
  payload: z
    .object({
      subscription: z
        .object({
          entity: z
            .object({
              id: z.string(),
              status: z.string(),
              start_at: z.number().optional(),
              end_at: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
      payment: z
        .object({ entity: z.object({ id: z.string() }).optional() })
        .optional(),
    })
    .optional(),
});
