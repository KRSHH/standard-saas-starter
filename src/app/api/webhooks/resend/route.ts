import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getResend } from "@/lib/email/client";
import { requireEnv } from "@/lib/env";
import { claimWebhookEvent } from "@/lib/payments/webhook-idempotency";
import {
  markEmailBounced,
  markEmailComplained,
} from "@/lib/notifications/store";
import { logAudit, requestContext } from "@/lib/audit/log";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/resend — delivery, bounce, complaint events.
 *
 * Mirrors the Stripe/Razorpay webhook skeleton: raw body → signature verify
 * → idempotency claim → handle known types → ack. Uses Resend's built-in
 * `webhooks.verify` (Svix under the hood) — no extra dependency.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Svix headers come in lowercased through Next's Headers. Check BEFORE
  // loading the secret so a request with no headers 400s regardless of
  // whether the server is fully configured.
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 },
    );
  }

  const webhookSecret = requireEnv(
    "RESEND_WEBHOOK_SECRET",
    process.env.RESEND_WEBHOOK_SECRET,
  );

  let event;
  try {
    event = getResend().webhooks.verify({
      payload: rawBody,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Idempotency: dedupe on the (provider, email_id) tuple. The notification's
  // email_message_id is the natural unique key — use it as the event id.
  const isEmailEvent = "email_id" in (event.data ?? {});
  const emailId = isEmailEvent
    ? (event.data as { email_id?: string }).email_id
    : undefined;
  const eventId = emailId ? `resend:${event.type}:${emailId}` : null;
  if (eventId) {
    const isNew = await claimWebhookEvent("resend", eventId, {
      eventType: event.type,
      payload: event,
    });
    if (!isNew) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
  }

  switch (event.type) {
    case "email.bounced":
    case "email.complained": {
      const data = event.data as { to?: string[] };
      const recipient = data.to?.[0];
      if (!recipient) break;
      // Find the user by email and stamp the suppression timestamp.
      const [profile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, recipient))
        .limit(1);
      if (!profile) break;

      if (event.type === "email.bounced") {
        await markEmailBounced(profile.id);
      } else {
        await markEmailComplained(profile.id);
      }

      void logAudit({
        actorId: profile.id,
        action:
          event.type === "email.bounced"
            ? AUDIT_ACTIONS.NOTIFICATION_EMAIL_BOUNCED
            : AUDIT_ACTIONS.NOTIFICATION_EMAIL_COMPLAINED,
        resourceType: AUDIT_RESOURCES.NOTIFICATION,
        resourceId: emailId ?? null,
        metadata: { recipient },
        request: requestContext(request),
      });
      break;
    }
    case "email.delivered":
    case "email.opened":
    case "email.sent":
    case "email.clicked":
      // No state change — delivery/open tracking is left to PostHog/Resend.
      break;
    default:
      // Unknown event types are acked so Resend stops retrying.
      break;
  }

  // Acknowledge — keep Resend from retrying. Future reconciliation can use
  // the email_message_id index on app.notifications to join events back.
  return NextResponse.json({ received: true });
}
