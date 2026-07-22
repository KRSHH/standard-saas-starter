import { NextResponse, type NextRequest } from "next/server";

import { rateLimit } from "@/lib/security/rate-limit";
import { verifyUnsubscribeToken } from "@/lib/notifications/tokens";
import {
  markUnsubscribed,
  removeEmailCategory,
} from "@/lib/notifications/store";
import { logAudit, requestContext } from "@/lib/audit/log";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";
import type { NotificationCategory } from "@/db/schema";

export const runtime = "nodejs";

/**
 * Unsubscribe endpoint — single source of truth for one-click opt-outs from
 * transactional email. GET is hit by the "Unsubscribe" link in emails (one-click,
 * no confirmation form — required by CAN-SPAM/GDPR); POST is the SPA equivalent.
 * Both share `applyUnsubscribe` so the logic can't drift between them.
 */
export async function GET(request: NextRequest) {
  const { limited, headers } = await rateLimit(request, {
    namespace: "notifications-unsub",
    limit: 30,
    window: 60,
  });
  if (limited) {
    return new NextResponse("Too many requests.", { status: 429, headers });
  }

  const token = request.nextUrl.searchParams.get("token");
  const result = await applyUnsubscribe(token, requestContext(request));
  if (!result.ok) {
    return new NextResponse(result.error, { status: result.status });
  }
  return new NextResponse(renderConfirmation(result.category), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** SPA variant — returns JSON instead of HTML. */
export async function POST(request: NextRequest) {
  const parsed = (await request.json().catch(() => null)) as {
    token?: string;
  } | null;
  const result = await applyUnsubscribe(parsed?.token, requestContext(request));
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true });
}

type UnsubscribeResult =
  | { ok: true; category?: string }
  | { ok: false; status: number; error: string };

async function applyUnsubscribe(
  token: string | null | undefined,
  ctx: ReturnType<typeof requestContext>,
): Promise<UnsubscribeResult> {
  if (!token) return { ok: false, status: 400, error: "Missing token." };
  // Token verification fails closed in production without the HMAC secret —
  // surface that as a clean 503 instead of an unhandled 500.
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET
  ) {
    return {
      ok: false,
      status: 503,
      error: "Unsubscribe is not configured. Please contact support.",
    };
  }
  const verified = verifyUnsubscribeToken(token);
  if (!verified.ok) {
    return {
      ok: false,
      status: 400,
      error: "Invalid or expired unsubscribe link.",
    };
  }

  if (verified.category) {
    await removeEmailCategory(
      verified.userId,
      verified.category as NotificationCategory,
    );
  } else {
    await markUnsubscribed(verified.userId);
  }

  void logAudit({
    actorId: verified.userId,
    action: AUDIT_ACTIONS.NOTIFICATION_UNSUBSCRIBED,
    resourceType: AUDIT_RESOURCES.NOTIFICATION,
    metadata: verified.category
      ? { scope: "category", category: verified.category }
      : { scope: "global" },
    request: ctx,
  });

  return { ok: true, category: verified.category };
}

function renderConfirmation(category?: string): string {
  const scope = category ? `the "${category}" category` : "all marketing email";
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:420px;margin:64px auto;padding:0 16px;color:#111">
<h1 style="font-size:22px;margin:0 0 12px">Unsubscribed</h1>
<p style="margin:0 0 16px;color:#415159">You will no longer receive ${scope} from us.</p>
<p style="margin:0;color:#8895a7;font-size:13px">You can re-enable these in your notification preferences.</p>
</body></html>`;
}
