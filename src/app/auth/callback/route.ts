import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Supabase PKCE OAuth + email confirmation callback.
 * Exchanges the `code` for a session, then redirects to /app
 * (or the original protected route the user tried to reach).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to sign-in with an error if exchange failed.
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
