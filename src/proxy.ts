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
  // Fail helpfully, not with a raw 500: a fresh clone without .env.local
  // would otherwise crash on every route deep inside the session refresh.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return missingEnvResponse();
  }

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

/**
 * Setup guidance when Supabase env vars are missing. Full instructions in
 * development; a terse 503 in production (never leak config state publicly).
 */
function missingEnvResponse(): NextResponse {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Service unavailable", { status: 503 });
  }
  const html = `<!doctype html>
<html><head><title>Setup required</title><style>
  body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;max-width:44rem;
       margin:4rem auto;padding:0 1rem;line-height:1.6;color:#e4e4e7;background:#09090b}
  code,pre{background:#18181b;border:1px solid #27272a;border-radius:6px;padding:.15rem .4rem}
  pre{padding:.75rem 1rem;overflow-x:auto}
  h1{font-size:1.25rem} a{color:#7dd3fc}
</style></head><body>
  <h1>⚙️ Almost there — Supabase env vars are missing</h1>
  <p>This template needs <code>NEXT_PUBLIC_SUPABASE_URL</code> and
     <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.</p>
  <pre>bun run setup   # creates .env.local + shows what's missing</pre>
  <p>Grab both values from your
     <a href="https://supabase.com/dashboard">Supabase dashboard</a> →
     Project Settings → API, then restart <code>bun run dev</code>.</p>
  <p>Full walkthrough: see the README's Quick start.</p>
</body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
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
