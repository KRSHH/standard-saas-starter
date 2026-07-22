import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import { buildCspHeader } from "@/lib/security/csp";

// Next.js middleware (proxy): CSP nonce, Supabase session refresh, auth gate.
export async function proxy(request: NextRequest) {
  // Fail helpfully, not with a 500: a fresh clone without Supabase configured
  // would crash here. Check the raw env (incl. integration aliases) before
  // touching the typed schema, which throws on missing required vars.
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname.startsWith("/api/health")) {
      return NextResponse.next();
    }
    return missingEnvResponse();
  }

  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const csp = buildCspHeader(nonce);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabaseResponse = await refreshSupabaseSession(request);
  response = supabaseResponse;
  response.headers.set("x-nonce", nonce);
  applySecurityHeaders(response, csp);

  return response;
}

// Whether Supabase client env is set — across every accepted alias.
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}

async function refreshSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    },
  );

  // getUser() refreshes the session server-side if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authed users away from the auth surface (not /forgot or /reset —
  // those land with an active recovered session).
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

// Setup guidance in dev; terse 503 in prod (never leak config state).
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
  <h1>Almost there — Supabase env vars are missing</h1>
  <p>This template needs a Supabase project URL and anon key. Either:</p>
  <p><strong>1.</strong> Connect the Supabase Vercel integration (one click), <em>or</em></p>
  <p><strong>2.</strong> Set <code>NEXT_PUBLIC_SUPABASE_URL</code> +
     <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.</p>
  <pre>bun run setup   # creates .env.local + shows what's missing</pre>
  <p>See the README Quick start for the full walkthrough.</p>
</body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function generateNonce(): string {
  const uuid = globalThis.crypto.randomUUID();
  return Buffer.from(uuid).toString("base64");
}

export const config = {
  // Run on every navigable path EXCEPT static assets, Next internals, webhooks.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
