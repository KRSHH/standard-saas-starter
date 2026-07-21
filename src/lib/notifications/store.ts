import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import {
  NOTIFICATION_CATEGORIES,
  notificationPreferences,
  notifications,
  type NewNotification,
  type Notification,
  type NotificationCategory,
  type NotificationPreference,
} from "@/db/schema";

/**
 * Notification store — CRUD over `app.notifications` + `app.notification_preferences`.
 * Mirrors the shape of `subscriptions.ts`. All functions run server-side via
 * the postgres Drizzle client (RLS-bypassing), which is appropriate because
 * notifications are system-generated, not user-generated.
 */

/** Insert one notification row. Returns the inserted row. */
export async function createNotification(
  input: NewNotification,
): Promise<Notification> {
  const [row] = await db.insert(notifications).values(input).returning();
  return row!;
}

/** List a user's notifications, newest first. Optionally only unread. */
export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Notification[]> {
  const limit = Math.min(opts.limit ?? 50, 100);
  return db
    .select()
    .from(notifications)
    .where(
      opts.unreadOnly
        ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
        : eq(notifications.userId, userId),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** Count a user's unread notifications via a SQL aggregate (not load-all). */
export async function countUnread(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.count ?? 0;
}

/** Mark a single notification as read. Returns true on success. */
export async function markRead(
  notificationId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .returning();
  return Boolean(row);
}

/** Mark all of a user's notifications as read. Returns the count updated. */
export async function markAllRead(userId: string): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning();
  return rows.length;
}

/**
 * Get a user's preference row, creating it with defaults if absent.
 * Auto-creation keeps callers from having to seed preferences on signup.
 */
export async function getPreferences(
  userId: string,
): Promise<NotificationPreference> {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId })
    .returning();
  return created!;
}

/** Patch a user's preferences. Only the supplied fields are updated. */
export async function updatePreferences(
  userId: string,
  patch: Partial<Pick<NotificationPreference, "emailEnabled">> & {
    emailCategories?: NotificationCategory[];
  },
): Promise<NotificationPreference> {
  const [row] = await db
    .update(notificationPreferences)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId))
    .returning();
  return row!;
}

/** Set the global unsubscribed_at timestamp (one-click unsubscribe). */
export async function markUnsubscribed(userId: string): Promise<void> {
  await db
    .update(notificationPreferences)
    .set({ unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId));
}

/** Remove a category from a user's email opt-ins (per-category unsubscribe). */
export async function removeEmailCategory(
  userId: string,
  category: NotificationCategory,
): Promise<void> {
  const prefs = await getPreferences(userId);
  const next = prefs.emailCategories.filter((c) => c !== category);
  await updatePreferences(userId, { emailCategories: next });
}

/** Record a bounce/complaint from the Resend webhook. */
export async function markEmailBounced(userId: string): Promise<void> {
  await db
    .update(notificationPreferences)
    .set({ bouncedAt: new Date(), updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId));
}

export async function markEmailComplained(userId: string): Promise<void> {
  await db
    .update(notificationPreferences)
    .set({ complainedAt: new Date(), updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId));
}

/** Attach a Resend message id to a notification row (for webhook reconciliation). */
export async function setEmailMessageId(
  notificationId: string,
  messageId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ emailMessageId: messageId })
    .where(eq(notifications.id, notificationId));
}

export { NOTIFICATION_CATEGORIES };
