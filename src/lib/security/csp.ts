/**
 * Strict Content-Security-Policy with a per-request nonce.
 *
 * The nonce is generated in middleware (per request) and:
 *   1. Forwarded to server components via the `x-nonce` request header.
 *   2. Set on the response Content-Security-Policy header for the browser.
 *
 * Next.js reads `x-nonce` from the request and automatically applies it to
 * all <Script> tags it injects, so inline scripts get the nonce for free.
 *
 * Reference: next.js/examples/with-strict-csp (context7 verified).
 */

export function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  // Trusted origins from env (comma-separated) — PostHog, Sentry, etc.
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  const sentryAllowed = "https://*.sentry.io https://*.ingest.sentry.io";

  // Cloudflare Turnstile (bot protection) — opt-in. When configured, allow
  // its script + iframe origins. Omitted entirely when the site key is unset.
  const turnstileEnabled =
    typeof process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === "string" &&
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY.length > 0;
  const turnstileScript = turnstileEnabled
    ? " https://challenges.cloudflare.com"
    : "";
  const turnstileFrame = turnstileEnabled
    ? " https://challenges.cloudflare.com"
    : "";

  const csp = [
    `default-src 'self';`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:${isDev ? " 'unsafe-eval'" : ""}${turnstileScript};`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline';`,
    `img-src 'self' blob: data: https:;`,
    `font-src 'self' data:;`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${posthogHost} ${sentryAllowed};`,
    `object-src 'none';`,
    `base-uri 'self';`,
    `form-action 'self';`,
    `frame-ancestors 'none';`,
    `frame-src 'self' https://js.razorpay.com${turnstileFrame};`,
    `upgrade-insecure-requests;`,
  ];

  return csp
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
