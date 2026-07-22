import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";

// Get the current Supabase user OR redirect to sign-in.
// Use in protected Server Components / Server Actions.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

// Get the current user or null — never redirects.
// Use in Route Handlers (via `withAuth`) or routes that render for both.
export async function getCurrentUserOrNull() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

// Get the current user's profile row. Returns null for a new signup.
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  return profile ?? null;
}

/**
 * Route-handler wrapper: auth gate + rate limit in one call.
 *
 *   export async function GET(request: NextRequest) {
 *     return withAuth(request, { namespace: "x", limit: 60, window: 60 }, (user) => {
 *       // ... handler body, user is typed
 *     });
 *   }
 *
 * Returns 401 on missing session, 429 on rate-limit hit. Passes the user to
 * the handler otherwise.
 */
export async function withAuth(
  request: NextRequest,
  rateLimitOpts: { namespace: string; limit: number; window: number },
  handler: (
    user: NonNullable<Awaited<ReturnType<typeof getCurrentUserOrNull>>>,
  ) => Promise<Response> | Response,
): Promise<Response> {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { limited, headers } = await rateLimit(request, rateLimitOpts);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers },
    );
  }

  return handler(user);
}
