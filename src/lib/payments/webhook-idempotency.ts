import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  webhookEvents,
  type NewWebhookEvent,
  type WebhookProvider,
} from "@/db/schema";

/**
 * Webhook idempotency — prevents duplicate event processing.
 *
 * Razorpay/Stripe/Resend retry webhooks on timeout. Without dedup, a single
 * event could be recorded twice. This helper inserts into `webhook_events`
 * which has a unique constraint on (provider, event_id). On conflict we know
 * it's a dup.
 *
 * @returns true if this is a NEW event (process it), false if duplicate (skip).
 */
export async function claimWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  meta?: { eventType?: string; payload?: unknown },
): Promise<boolean> {
  const input: NewWebhookEvent = {
    provider,
    eventId,
    eventType: meta?.eventType,
    payload:
      meta?.payload === undefined ? undefined : z.json().parse(meta.payload),
  };

  try {
    await db.insert(webhookEvents).values(input);
    return true;
  } catch (error) {
    if (isPostgresError(error) && error.code === "23505") return false;
    throw error;
  }
}

function isPostgresError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

/** Count events processed in a window — for observability dashboards. */
export async function recentEventCount(
  provider: WebhookProvider,
  sinceSeconds: number,
): Promise<number> {
  const rows = await db.execute<{ count: number }>(sql`
    select count(*)::int as count
    from app.webhook_events
    where provider = ${provider}
      and processed_at > now() - (${sinceSeconds} || ' seconds')::interval
  `);
  return rows[0]?.count ?? 0;
}
