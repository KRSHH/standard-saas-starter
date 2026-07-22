# 02 — Environment Variables

This is the complete reference for every environment variable in the template:
what it does, where it's read, whether it's required, and how to configure it
across local / preview / staging / production.

> **The short version:** `.env*` files are a **local-dev convenience only.**
> In preview, staging, and production, env vars come from the hosting platform
> (`process.env`) — never from committed files. There is no `.env.staging`
> convention in Next.js. Creating one is the bodge to avoid.

---

## Where env values come from

- **Local dev:** `.env.local` (gitignored). Copy it from `.env.example` via
  `bun run setup` or `cp .env.example .env.local`.
- **Deployed (Vercel / Railway / self-hosted):** the hosting platform's env
  settings, injected into `process.env` at runtime. Never commit a
  `.env.production` — it would contain real secrets.

Every real env file is gitignored; only `.env.example` is committed.

> **One-click on Vercel?** The Supabase Vercel integration injects vars under
> its own names (`POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, …). The
> typed env schema auto-detects all of them — see the alias list below.

---

## The complete variable reference

Grouped by feature area. Each entry shows:

- **Status:** Required / Optional / Public (exposed to browser).
- **Read by:** the file(s) that consume it.
- **What it controls.**
- **How to get the value.**

Legend:

- **Required** — app throws on first use if missing.
- **Optional** — feature degrades gracefully (lazy init, no-op, or hidden UI).
- **Public** — `NEXT_PUBLIC_` prefix; inlined into the browser bundle at build time.

### App identity

| Variable                  | Status           | Read by                                      | Controls                                                                                                                                         |
| ------------------------- | ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`     | Optional, Public | `src/lib/site.ts`, `src/lib/auth/actions.ts` | Canonical origin (no trailing slash). Sitemap, canonical URLs, OG metadata, JSON-LD, auth redirect targets. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_APP_NAME`    | Optional, Public | `src/lib/site.ts`                            | Product name. `<title>`, manifest, email branding, logo monogram. Defaults to `Acme`.                                                            |
| `NEXT_PUBLIC_TWITTER_URL` | Optional, Public | `src/lib/site.ts`                            | Optional. Added to JSON-LD `sameAs` + footer when set.                                                                                           |
| `NEXT_PUBLIC_GITHUB_URL`  | Optional, Public | `src/lib/site.ts`                            | Optional. Added to JSON-LD `sameAs` + footer when set.                                                                                           |

**Production setup:** set `NEXT_PUBLIC_APP_URL` to your real origin
(e.g. `https://yourapp.com`) and `NEXT_PUBLIC_APP_NAME` to your brand. These
affect SEO and email links — wrong values here = broken canonical URLs and
auth redirects.

### Supabase (Auth + Postgres + Storage)

| Variable                        | Status            | Read by                                                                            | Controls                                                                                                                                                              |
| ------------------------------- | ----------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Required, Public  | `src/lib/env.ts` → `supabase/{server,client}.ts`, `proxy.ts`                       | Your Supabase project URL. Used by both server and browser clients.                                                                                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required, Public  | `src/lib/env.ts` → `supabase/{server,client}.ts`, `proxy.ts`                       | The anon/public key. Subject to RLS — safe for the browser.                                                                                                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Optional (server) | `src/lib/supabase/admin.ts`, `src/lib/notifications/tokens.ts` (dev fallback only) | Service-role key. **Bypasses RLS.** Used by webhooks, admin actions (account deletion), and audit logging. NEVER expose to the browser or prefix with `NEXT_PUBLIC_`. |
| `DATABASE_URL`                  | Required          | `src/db/index.ts`, `drizzle.config.ts`                                             | Postgres connection string for Drizzle.                                                                                                                               |

> **One-click integration (no manual env needed):** if you connect the
> Supabase Vercel integration, you don't have to set these names. The resolver
> in `src/lib/env.ts` auto-detects the integration's aliases — canonical names
> always win, aliases are only consulted when the canonical name is unset:
>
> - `NEXT_PUBLIC_SUPABASE_URL` ← also `SUPABASE_URL`
> - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← also `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`
> - `SUPABASE_SERVICE_ROLE_KEY` ← also `SUPABASE_SECRET_KEY`
> - `DATABASE_URL` ← also `POSTGRES_URL`, `POSTGRES_PRISMA_URL`
>
> Migrations prefer the **direct** connection: `drizzle.config.ts` checks
> `POSTGRES_URL_NON_POOLING` first (port 5432), then `DATABASE_URL`, then the
> pooled aliases — so `drizzle-kit migrate` works either way.

> **Why Supabase throws at startup when unconfigured:** `src/proxy.ts`
> (middleware) runs on every request and accesses the typed `env` to build the
> Supabase client. With no Supabase configured, the schema validation fails and
> renders the setup page (dev) or returns 503 (prod). This is intentional.

**How to get the values:** Supabase Dashboard → **Project Settings → API**
(URL + keys) and **→ Database → Connection string**.

> **Client vs server vs admin clients:** see
> [Database](./03-database.md#the-three-supabase-clients) for which client is
> used where, and what each can do (RLS-enforced vs RLS-bypassing).

### Database connection

| Variable       | Status   | Read by           | Controls                                                                                        |
| -------------- | -------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Required | `src/db/index.ts` | The Drizzle `postgres-js` connection. Single connection, `prepare: false` (pgBouncer-friendly). |

- **Local dev + migrations:** direct connection, port `5432`.
- **Serverless production (Vercel):** session pooler (pgBouncer), port `6543`.

The Drizzle client (`src/db/index.ts`) runs as the Postgres `postgres` role and
**bypasses RLS**. This is intentional for server-authoritative writes
(webhooks, server actions, audit logs). Client-facing reads go through the
RLS-enforced Supabase SSR client. See [Database](./03-database.md).

### Rate limiting (Upstash)

| Variable                   | Status                    | Read by                          | Controls                     |
| -------------------------- | ------------------------- | -------------------------------- | ---------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Optional (prod: Required) | `src/lib/security/rate-limit.ts` | Upstash Redis REST endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | Optional (prod: Required) | `src/lib/security/rate-limit.ts` | Upstash REST token.          |

**Behavior:** when both are set, rate limiting is distributed (works across
multiple serverless instances). When neither is set:

- In **development** — an in-memory limiter is used (single-instance only).
- In **production** — the limiter **fails closed** (throws). This is deliberate:
  you should never silently run un-rate-limited in prod.

See [Security → Rate limiting](./08-security.md#rate-limiting).

### Razorpay (optional — popular in India)

| Variable                   | Status   | Read by                        | Controls                                  |
| -------------------------- | -------- | ------------------------------ | ----------------------------------------- |
| `RAZORPAY_KEY_ID`          | Optional | `src/lib/payments/razorpay.ts` | Server API key.                           |
| `RAZORPAY_KEY_SECRET`      | Optional | `src/lib/payments/razorpay.ts` | Server API secret.                        |
| `RAZORPAY_WEBHOOK_SECRET`  | Optional | `src/lib/payments/razorpay.ts` | HMAC secret for `/api/webhooks/razorpay`. |
| `RAZORPAY_STARTER_PLAN_ID` | Optional | `src/lib/payments/plans.ts`    | Plan id for the Starter tier.             |
| `RAZORPAY_PRO_PLAN_ID`     | Optional | `src/lib/payments/plans.ts`    | Plan id for the Pro tier.                 |

**How to get the values:** Razorpay Dashboard → **Settings → API Keys**
(key id + secret), **→ Webhooks** (create one for
`/api/webhooks/razorpay`, copy the secret), and **→ Subscriptions → Plans**
(create plans, copy ids into `*_PLAN_ID`).

Lazily initialized — the app runs without these until you hit the checkout.
See [Billing](./05-billing.md).

### Stripe (global payments)

| Variable                  | Status   | Read by                                | Controls                                           |
| ------------------------- | -------- | -------------------------------------- | -------------------------------------------------- |
| `STRIPE_SECRET_KEY`       | Optional | `src/lib/payments/stripe.ts`           | Server secret key (`sk_test_...` / `sk_live_...`). |
| `STRIPE_WEBHOOK_SECRET`   | Optional | `src/app/api/webhooks/stripe/route.ts` | Signing secret for the Stripe webhook endpoint.    |
| `STRIPE_STARTER_PRICE_ID` | Optional | `src/lib/payments/plans.ts`            | Price id for the Starter tier.                     |
| `STRIPE_PRO_PRICE_ID`     | Optional | `src/lib/payments/plans.ts`            | Price id for the Pro tier.                         |

**How to get the values:** Stripe Dashboard → **Developers → API keys**
(secret + publishable), **→ Developers → Webhooks** (add an endpoint for
`/api/webhooks/stripe`, copy the signing secret), and **→ Products** (create
products + recurring prices, copy `price_...` ids).

Lazily initialized. See [Billing](./05-billing.md).

### Email (Resend)

| Variable                           | Status                    | Read by                                | Controls                                                                                                                      |
| ---------------------------------- | ------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`                   | Optional                  | `src/lib/email/client.ts`              | Resend API key (`re_...`).                                                                                                    |
| `EMAIL_FROM`                       | Optional                  | `src/lib/email/client.ts`              | Sender address for transactional email. Must be on a verified domain (or the Resend sandbox `onboarding@resend.dev` for dev). |
| `EMAIL_REPLY_TO`                   | Optional                  | `src/lib/email/client.ts`              | Reply-To address.                                                                                                             |
| `RESEND_WEBHOOK_SECRET`            | Optional                  | `src/app/api/webhooks/resend/route.ts` | Signing secret for the Resend webhook (bounce/complaint/delivery events).                                                     |
| `NOTIFICATIONS_UNSUBSCRIBE_SECRET` | Optional (prod: Required) | `src/lib/notifications/tokens.ts`      | HMAC secret for stateless unsubscribe tokens. In dev it's derived automatically; in prod you should set it explicitly.        |

**How to get the values:** Resend Dashboard → **API Keys** (create one),
**→ Domains** (verify a domain to send from it), **→ Webhooks** (create one
for `/api/webhooks/resend`, copy the signing secret).

Lazily initialized — email sending no-ops if `RESEND_API_KEY` is missing.
See [Email & Notifications](./06-email-notifications.md).

### Analytics (PostHog)

| Variable                   | Status           | Read by                                                                                                  | Controls                                                                                                     |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_POSTHOG_KEY`  | Optional, Public | `src/components/providers/posthog.tsx`, `src/lib/analytics/posthog-server.ts`                            | Project API key.                                                                                             |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional, Public | `src/components/providers/posthog.tsx`, `src/lib/analytics/posthog-server.ts`, `src/lib/security/csp.ts` | PostHog host (e.g. `https://app.posthog.com` or self-hosted). Also added to the CSP `connect-src` allowlist. |

**How to get the values:** PostHog → **Project Settings** (API key + host).

When the key is missing, the PostHog provider renders children without
initializing PostHog — analytics just doesn't run. See
[Analytics & Errors](./07-analytics-errors.md).

### Error tracking (Sentry)

| Variable                 | Status           | Read by                                                           | Controls                                                                                                                              |
| ------------------------ | ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional, Public | `src/instrumentation-client.ts`, `sentry.{server,edge}.config.ts` | Project DSN. The client reads this public var (the client bundle can't see server vars). Sentry is disabled when unset.               |
| `SENTRY_ORG`             | Optional         | `next.config.ts` (build-time, via `withSentryConfig`)             | Sentry org slug — for source map uploads at build.                                                                                    |
| `SENTRY_PROJECT`         | Optional         | `next.config.ts` (build-time, via `withSentryConfig`)             | Sentry project slug.                                                                                                                  |
| `SENTRY_AUTH_TOKEN`      | Optional         | `next.config.ts` (build-time, via `withSentryConfig`)             | Auth token for source map uploads. When unset, `next.config.ts` skips the `withSentryConfig` wrapper entirely (local/CI stays quiet). |

> The server and edge configs also accept the legacy `SENTRY_DSN` as a fallback
> (`process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN`), but new
> setups should use `NEXT_PUBLIC_SENTRY_DSN` so all three runtimes share one var.

See [Analytics & Errors](./07-analytics-errors.md).

### Bot protection (Cloudflare Turnstile — optional)

| Variable                         | Status           | Read by                                                        | Controls                                                                                                     |
| -------------------------------- | ---------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional, Public | `src/components/auth/turnstile.tsx`, `src/lib/security/csp.ts` | Site key. When set, the Turnstile widget renders on sign-in/sign-up and the CSP allows the Turnstile script. |

**Opt-in.** When the site key is unset, the widget renders nothing and the
CSP omits the Turnstile origins — forms work zero-config. When set, you must
also enable captcha in Supabase (Auth → Settings → Bot & Abuse). See
[Security → Turnstile](./08-security.md#turnstile).

> **No `TURNSTILE_SECRET_KEY` env var.** The secret key goes in the Supabase
> dashboard (Auth → Settings → Bot & Abuse Protection), where Supabase verifies
> the token server-side. The template never reads it from env.

### Built-in Next.js variables

These are set by Next.js itself, not by you, but the code reads them:

| Variable       | Set by                                          | Read by                                                     | Controls                                                                    |
| -------------- | ----------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`     | Next.js (`development` / `production` / `test`) | `src/lib/security/csp.ts`, `src/lib/security/rate-limit.ts` | CSP loosens (adds `'unsafe-eval'`) in dev; rate-limit fallback is dev-only. |
| `NEXT_RUNTIME` | Next.js (`nodejs` / `edge`)                     | `src/instrumentation.ts`                                    | Which Sentry config to load.                                                |

---

## Setting them up by environment

### Local development

```bash
cp .env.example .env.local
# Edit .env.local — fill in real values
bun run dev
```

`.env.local` is the only file you need locally. It's gitignored.

### Vercel preview & production

In the Vercel dashboard: **Project → Settings → Environment Variables**.
Add each variable **twice** (or select multiple scopes) for Preview and
Production. Key ones to remember:

- `NEXT_PUBLIC_*` vars are **inlined at build time**, so a Vercel redeploy is
  required when you change them.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc. are runtime-only —
  a redeploy isn't strictly required, but Vercel applies them on the next
  deployment.

Use a **separate Supabase project** for preview if you can — keeps test data
out of production auth.

### Self-hosted (Docker)

```bash
docker run --env-file .env.production \
  -p 3000:3000 \
  your-image
```

Never bake secrets into the image. Use an env file that lives on the host
(gitignored) or your orchestrator's secret store.

### CI (GitHub Actions)

```yaml
- run: bun run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    # ...
```

For builds, you need at least the `NEXT_PUBLIC_*` vars (they're inlined).
Server-only vars aren't needed for `next build` unless your build does data
fetching.

---

## Common mistakes

**Putting the service-role key in a `NEXT_PUBLIC_` var.** This bypasses all
RLS in the browser. The service-role key must stay server-only. The template
never prefixes it.

**Committing `.env.local`.** The `.gitignore` covers it, but if you ever
override that, you'll leak every secret. Never `git add -f .env.local`.

**Expecting `.env.staging` to do something.** It doesn't — Next.js only
recognizes `development`, `production`, and `test` modes. Staging values come
from the platform.

**Forgetting to redeploy after changing `NEXT_PUBLIC_*`.** Public vars are
inlined at build. Change them in Vercel, then trigger a new deployment.

**Using the anon key for admin operations.** The anon key is RLS-enforced.
For admin/webhook writes, use the service-role key via `createAdminClient()`.
See [Database](./03-database.md#the-three-supabase-clients).

**Using the dev database for prod.** Use separate Supabase projects per
environment. The schema is the same; the data and keys differ.

---

## The typed env schema

`src/lib/env.ts` uses [`@t3-oss/env-nextjs`](https://env.t3.gg) to validate
every env var at startup via Zod. Read `env.X` everywhere instead of
`process.env.X`:

- **Required vars** (Supabase URL/anon key, `DATABASE_URL`) throw on first
  access if missing — the app fails fast with a clear message.
- **Optional vars** (Stripe, Resend, PostHog, …) are `.optional()` in the
  schema, so the app runs fine without them; each integration no-ops when its
  var is unset.

Aliases (the Supabase Vercel integration's `POSTGRES_URL`, `SUPABASE_URL`, …)
resolve inside `runtimeEnv` — the single place that knows about them. To add
a new env var, add it to the `server`/`client` schema and `runtimeEnv` map.
