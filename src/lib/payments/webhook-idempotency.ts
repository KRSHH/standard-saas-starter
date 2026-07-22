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
 * Providers retry on timeout; without dedup a single event could be recorded
 * twice. Inserts into `webhook_events` (unique on provider + event_id). On
 * conflict (Postgres 23505) we know it's a dup.
 *
 * @returns true if NEW (process it), false if duplicate (skip).
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
