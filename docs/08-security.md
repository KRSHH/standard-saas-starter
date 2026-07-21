# 08 — Security

The template ships a hardened baseline: strict CSP with per-request nonce,
security headers, rate limiting, optional bot protection, and an append-only
audit log. This page covers each layer.

---

## Content-Security-Policy (CSP)

`src/lib/security/csp.ts` builds a strict CSP per request, applied in
`src/proxy.ts` (middleware).

### The nonce flow

1. **Middleware generates** a random nonce per request (`globalThis.crypto.randomUUID()`
   base64-encoded).
2. **Request:** nonce set on the `x-nonce` request header so server components
   can read it.
3. **Response:** nonce baked into the `Content-Security-Policy` header.
4. **Next.js** reads `x-nonce` and auto-applies it to all `<script>` tags it
   injects — so Next's own scripts get the nonce for free.

```ts
script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:${isDev ? " 'unsafe-eval'" : ""};
```

- `'strict-dynamic'` lets trusted scripts load their own dependencies without
  enumerating every origin.
- `'unsafe-eval'` is added **only in dev** (Turbopack/HMR need it). Removed in
  production.
- `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'` — strict
  defaults.

### Provider-specific allowlists

| Provider | CSP directive | Added when |
|----------|---------------|------------|
| Supabase | `connect-src https://*.supabase.co wss://*.supabase.co` | Always (the app needs it). |
| PostHog | `connect-src <POSTHOG_HOST>` | `NEXT_PUBLIC_POSTHOG_HOST` is set. |
| Sentry | `connect-src https://*.sentry.io https://*.ingest.sentry.io` | Always. |
| Razorpay | `frame-src https://js.razorpay.com` | Always (checkout iframe). |
| Turnstile | `script-src` + `frame-src https://challenges.cloudflare.com` | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. |

> **Adding a new external service?** Add its origins to `buildCspHeader()` or
> it'll be blocked. Don't loosen the whole policy — allowlist the specific
> origins.

---

## Security headers

Applied to every response in `src/proxy.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | (per-request, see above) | Prevents XSS, injection. |
| `X-Frame-Options` | `DENY` | Clickjacking (no iframing). |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Disables sensitive APIs + FLoC. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS. |
| `X-DNS-Prefetch-Control` | `on` | Faster DNS for external resources. |

---

## Rate limiting

`src/lib/security/rate-limit.ts` — distributed (Upstash Redis) in production,
in-memory in dev.

### Usage

```ts
import { rateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

const { limited, headers } = await rateLimit(request, {
  namespace: "sign-in",
  limit: 10,
  window: 60, // seconds
});

if (limited) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429, headers });
}
```

Returns standard `RateLimit-*` headers (`Limit`, `Remaining`, `Reset`) +
`Retry-After`.

### Behavior by environment

| Environment | Upstash configured? | Behavior |
|-------------|---------------------|----------|
| Dev | No | In-memory limiter (per-process). |
| Dev | Yes | Upstash (distributed). |
| **Prod** | No | **Throws** (fails closed). |
| Prod | Yes | Upstash. |

> **Why fail closed in prod?** An un-rate-limited production server is a
> security hole (brute-force, abuse). If you deploy without Upstash, the
> rate-limited routes will 500 until you configure it — which is the correct
> loud signal that something's missing.

### Keys are IP-based

`getClientIp(request)` reads `x-forwarded-for` (first hop) → `x-real-ip` →
`"unknown"`. On Vercel, `x-forwarded-for` is set correctly. If you self-host
behind a proxy, make sure your proxy sets it.

### Configuration

```dotenv
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Create a Redis database at [upstash.com](https://upstash.com) (free tier works).
Required for any production deploy that uses rate-limited routes.

---

## Turnstile (bot protection)

`src/components/auth/turnstile.tsx` — optional Cloudflare bot protection for
the sign-in / sign-up forms.

### Opt-in

When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set:

1. The widget renders on auth forms.
2. On success, the token is passed to `supabase.auth.signUp({ options: { captchaToken } })`.
3. Supabase verifies the token server-side — no separate verification endpoint.

When unset, the widget renders nothing and the CSP omits Turnstile origins.

### Setup

1. Create a site at [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).
2. Set env vars:

   ```dotenv
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   TURNSTILE_SECRET_KEY=0x4AAAAAAB...
   ```

3. Enable captcha in Supabase: **Auth → Settings → Bot & Abuse Protection**.
4. Done — the widget and verification are automatic.

---

## Audit logging

Append-only record of security-sensitive actions. Written by the service role
(clients have no insert policy → can't forge rows).

### What gets audited

Actions are enumerated in `src/lib/audit/actions.ts`. Typical entries:

- `user.password_changed`, `user.email_changed`
- `user.account_deleted`, `user.reauthenticated`
- `user.oauth_linked` / `user.oauth_unlinked`
- `user.profile_updated`
- `notification.email_bounced`, `notification.email_complained`
- `notification.email_suppressed`

### How to log

```ts
import { logAudit } from "@/lib/audit/log";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

await logAudit({
  actorId: user.id,
  action: AUDIT_ACTIONS.USER_PROFILE_UPDATED,
  resourceType: AUDIT_RESOURCES.USER,
  resourceId: user.id,
  metadata: { field: "full_name" },
  request: requestContext(request), // optional: ip, user agent, request id
});
```

### Sanitization

`src/lib/audit/sanitize.ts` redacts sensitive keys (passwords, tokens, secrets)
before insert. Metadata is still treated as untrusted — it's best-effort
scrubbing, not a guarantee.

### Survival on deletion

`audit_logs.actor_id` is `ON DELETE SET NULL` (not cascade). When a user is
deleted, their audit rows survive with a null actor — a regulatory expectation
for auth/billing/destructive actions.

### Fire-and-forget

`logAudit` catches insert errors and warns — it never breaks the request.
Callers `await` it but a failure is logged, not propagated.

---

## RLS (database-level)

The last line of defense. Even if a bug lets a client query a table directly
via the anon key, RLS policies restrict what they can see. See
[Database → RLS](./03-database.md#rls-pattern) for the full breakdown.

The key invariant: **service-role-only tables** (`webhook_events`,
`audit_logs` inserts) have no client policy → clients can't touch them at all.

---

## Common tasks

### Add a rate-limited route

```ts
const { limited, headers } = await rateLimit(request, {
  namespace: "my-route",
  limit: 20,
  window: 60,
});
if (limited) return NextResponse.json({ error: "Rate limited" }, { status: 429, headers });
```

### Audit a new sensitive action

1. Add the action + resource to `src/lib/audit/actions.ts`.
2. Call `logAudit(...)` at the point of mutation, **before** the mutation
   where possible (so the row exists even if the mutation fails).

### Allow a new external script

Add its origin to the relevant CSP directive in `src/lib/security/csp.ts`.
Prefer `'strict-dynamic'` (via a trusted loader) over explicit allowlists where
possible.

### Rotate the unsubscribe secret

Set a new `NOTIFICATIONS_UNSUBSCRIBE_SECRET`. All existing unsubscribe tokens
become invalid — users will need to use the in-app preferences to unsubscribe
until they get a new email with a fresh token.
