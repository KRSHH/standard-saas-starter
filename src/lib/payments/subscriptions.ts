import { eq } from "drizzle-orm";

import { db } from "@/db";
import { subscriptions, type NewSubscription } from "@/db/schema";
import { isEntitled } from "@/lib/payments/entitlement";

/**
 * Subscription store — the ONLY place subscription status is written.
 * This is the server-authoritative record (docs/05 Rule 5, docs/09 §gating).
 * Client code must never read plan/status from anywhere except this table
 * via an authenticated server call.
 *
 * `isEntitled` is re-exported from here for ergonomic single-import usage.
 */
export { isEntitled };

export async function createSubscription(input: NewSubscription) {
  const [row] = await db.insert(subscriptions).values(input).returning();
  return row;
}

export async function getActiveSubscription(userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(subscriptions.createdAt)
    .limit(1);
  return row ?? null;
}

export async function updateSubscriptionByProviderId(
  providerSubscriptionId: string,
  patch: Partial<NewSubscription>,
) {
  const [row] = await db
    .update(subscriptions)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
    .returning();
  return row;
}
