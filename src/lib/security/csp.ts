import { env } from "@/lib/env";

// Strict Content-Security-Policy with a per-request nonce.
// Next.js reads `x-nonce` from the request and applies it to injected scripts.
export function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const posthogHost = env.NEXT_PUBLIC_POSTHOG_HOST ?? "";
  const sentry = "https://*.sentry.io https://*.ingest.sentry.io";

  // Turnstile origins only when the site key is configured.
  const turnstile = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ? " https://challenges.cloudflare.com"
    : "";

  const csp = [
    `default-src 'self';`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:${isDev ? " 'unsafe-eval'" : ""}${turnstile};`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline';`,
    `img-src 'self' blob: data: https:;`,
    `font-src 'self' data:;`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${posthogHost} ${sentry};`,
    `object-src 'none';`,
    `base-uri 'self';`,
    `form-action 'self';`,
    `frame-ancestors 'none';`,
    `frame-src 'self' https://js.razorpay.com${turnstile};`,
    `upgrade-insecure-requests;`,
  ];

  return csp
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
