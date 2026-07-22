import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { db } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Health check — process up + DB reachable. Reports integration status. */
export async function GET() {
  const checks: { app: string; timestamp: string; db: string } = {
    app: "ok",
    timestamp: new Date().toISOString(),
    db: "ok",
  };

  try {
    await db.execute("select 1");
  } catch {
    checks.db = "error";
    return NextResponse.json({ status: "unhealthy", checks }, { status: 503 });
  }

  // Which optional integrations this deploy has configured (booleans only).
  const integrations = {
    stripe: Boolean(env.STRIPE_SECRET_KEY),
    razorpay: Boolean(env.RAZORPAY_KEY_ID),
    resend: Boolean(env.RESEND_API_KEY),
    posthog: Boolean(env.NEXT_PUBLIC_POSTHOG_KEY),
    sentry: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
    upstash: Boolean(env.UPSTASH_REDIS_REST_URL),
    turnstile: Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  };

  return NextResponse.json({ status: "healthy", checks, integrations });
}
