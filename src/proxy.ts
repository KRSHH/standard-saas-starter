import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { buildCspHeader } from "@/lib/security/csp";
import { getPublicSupabaseEnv } from "@/lib/env";

/**
 * Single Next.js middleware:
 *   1. Generate a CSP nonce → set on request + response headers.
 *   2. Refresh Supabase auth session (writes refreshed cookies).
 *   3. Enforce /app auth gate + /auth redirect-if-authed.
 *   4. Attach standard security headers to every response.
 *
 * Order matters: nonce first (so server components can read it), then session.
 */
export async function proxy(request: NextRequest) {
  const nonce = generateNonce();

  // Build the request-headers snapshot with the nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // 1. CSP header string (per-request nonce baked in).
  const csp = buildCspHeader(nonce);

  // 2. Start with a passthrough response that carries the nonce request headers.
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // 3. Supabase session refresh. Creates its own response (setAll swaps cookies).
  const supabaseResponse = await refreshSupabaseSession(request);
  // Merge: keep the nonce request headers from `response`, but use supabaseResponse
  // for cookie writes. Copy nonce + CSP onto the supabase response so both win.
  response = supabaseResponse;
  response.headers.set("x-nonce", nonce);
  applySecurityHeaders(response, csp);

  return response;
}

async function refreshSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() refreshes the session server-side if needed.
  // IMPORTANT: do not run code between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /app routes.
  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from the public auth surface.
  // /forgot-password and /reset-password are intentionally EXCLUDED — the
  // password-reset flow lands here with an active recovered session.
  if (
    user &&
    ["/sign-in", "/sign-up", "/check-email"].includes(request.nextUrl.pathname)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

/** Attach the security header bundle to a response. */
function applySecurityHeaders(res: NextResponse, csp: string) {
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  res.headers.set("X-DNS-Prefetch-Control", "on");
}

function generateNonce(): string {
  // Use the Web Crypto API (globalThis.crypto) — available in both edge and
  // node runtimes in Next 16. Avoids the Node `crypto` module which is not
  // in the Edge Runtime's supported native modules list.
  const uuid = globalThis.crypto.randomUUID();
  return Buffer.from(uuid).toString("base64");
}

export const config = {
  // Run on every navigable path EXCEPT static assets and Next internals.
  // Webhooks are excluded — they have their own signature verification.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
