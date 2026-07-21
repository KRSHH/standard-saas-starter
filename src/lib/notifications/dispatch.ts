import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles, type JsonValue, type NotificationLevel } from "@/db/schema";
import { emailFrom, getResend } from "@/lib/email/client";
import { siteConfig } from "@/lib/site";
import { NotificationEmail } from "@/emails/notification";
import {
  createNotification,
  getPreferences,
  setEmailMessageId,
} from "@/lib/notifications/store";
import { signUnsubscribeToken } from "@/lib/notifications/tokens";
import { logAudit } from "@/lib/audit/log";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

/**
 * Provider-neutral notification dispatcher.
 *
 * Always creates an in-app notification row. Optionally also sends an email
 * if the user's preferences allow it (emailEnabled, category is opted in,
 * not globally unsubscribed/bounced/complained).
 *
 * Email failures are logged + audited but never propagate — notifications
 * are best-effort; an in-app row is still there for the user to see.
 */

export interface DispatchInput {
  userId: string;
  category: string;
  level?: NotificationLevel;
  title: string;
  body?: string;
  url?: string;
  /** Default true — pass false to suppress email even if prefs allow it. */
  sendEmail?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface DispatchResult {
  notificationId: string;
  emailed: boolean;
}

export async function dispatchNotification(
  input: DispatchInput,
): Promise<DispatchResult> {
  const level = input.level ?? "info";

  // 1. Always create the in-app row.
  const notification = await createNotification({
    userId: input.userId,
    channel: "in_app",
    level,
    category: input.category,
    title: input.title,
    body: input.body ?? null,
    url: input.url ?? null,
    metadata: (input.metadata ?? null) as JsonValue | null,
  });

  // 2. Decide whether to email. Defaults to "yes if prefs allow".
  const shouldEmail = input.sendEmail !== false && (await emailAllowed(input));
  if (!shouldEmail) {
    return { notificationId: notification.id, emailed: false };
  }

  // 3. Render + send. Best-effort — never throw.
  try {
    const [profile] = await db
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, input.userId))
      .limit(1);
    if (!profile?.email) {
      return { notificationId: notification.id, emailed: false };
    }

    const unsubscribeUrl = buildUnsubscribeUrl(input.userId, input.category);
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: profile.email,
      subject: input.title,
      react: NotificationEmail({
        title: input.title,
        body: input.body,
        actionUrl: input.url,
        actionLabel: input.url ? "Open" : undefined,
        unsubscribeUrl,
      }),
      tags: [{ name: "category", value: input.category }],
    });
    if (error) {
      throw error;
    }
    if (data?.id) {
      await setEmailMessageId(notification.id, data.id);
    }
    return { notificationId: notification.id, emailed: true };
  } catch (error) {
    console.warn(
      `[notifications] email dispatch failed for user ${input.userId}`,
      error,
    );
    void logAudit({
      actorId: input.userId,
      action: AUDIT_ACTIONS.NOTIFICATION_EMAIL_SUPPRESSED,
      resourceType: AUDIT_RESOURCES.NOTIFICATION,
      resourceId: notification.id,
      metadata: { category: input.category, reason: "send_error" },
    });
    return { notificationId: notification.id, emailed: false };
  }
}

/** True if email should be sent based on the user's preference row. */
async function emailAllowed(input: DispatchInput): Promise<boolean> {
  const prefs = await getPreferences(input.userId);
  if (!prefs.emailEnabled) return false;
  if (prefs.unsubscribedAt || prefs.bouncedAt || prefs.complainedAt) {
    return false;
  }
  if (!prefs.emailCategories.includes(input.category as never)) {
    return false;
  }
  return true;
}

function buildUnsubscribeUrl(userId: string, category: string): string {
  const token = signUnsubscribeToken({ userId, category });
  return `${siteConfig.url}/api/notifications/unsubscribe?token=${token}`;
}
