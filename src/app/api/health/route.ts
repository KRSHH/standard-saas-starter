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

  return NextResponse.json({ status: "healthy", checks });
}
