import { NextResponse } from "next/server";

import { db } from "@/db";

/**
 * Health check — used by uptime monitors (UptimeRobot, Better Stack) and
 * load balancers (Vercel reads this implicitly via 200 status).
 *
 * Checks: process up, DB reachable. Returns 503 if any dependency is down.
 * Intentionally lightweight — no auth, no logging, cache-busted.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks: {
    app: string;
    timestamp: string;
    db: string;
  } = {
    app: "ok",
    timestamp: new Date().toISOString(),
    db: "ok",
  };

  try {
    // Cheapest possible DB round-trip.
    await db.execute("select 1");
  } catch {
    checks.db = "error";
    return NextResponse.json({ status: "unhealthy", checks }, { status: 503 });
  }

  // Which optional integrations this deploy has configured — booleans only,
  // never values. Lets you verify env wiring right after a deploy.
  const integrations = {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    razorpay: !!process.env.RAZORPAY_KEY_ID,
    resend: !!process.env.RESEND_API_KEY,
    posthog: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    sentry: !!(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN),
    upstash: !!process.env.UPSTASH_REDIS_REST_URL,
    turnstile: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };

  return NextResponse.json({ status: "healthy", checks, integrations });
}
