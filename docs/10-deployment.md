# 10 — Deployment

How to ship to preview, staging, and production. The core principle:
**`.env*` files are local-dev only. Deployed environments get their values
from the platform's `process.env`.** See
[Environment Variables](./02-environment-variables.md) for the full model.

---

## Before you deploy

### 1. Set `NEXT_PUBLIC_APP_URL`

This is the canonical origin. Wrong value = broken canonical URLs, broken
sitemaps, broken auth redirects. Set it to your real production origin
(`https://yourapp.com`, no trailing slash).

### 2. Configure rate limiting (Upstash)

Production **fails closed** without Upstash. Create a Redis DB at
[upstash.com](https://upstash.com) and set:

```dotenv
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Set the unsubscribe secret

```dotenv
NOTIFICATIONS_UNSUBSCRIBE_SECRET=<long random string>
```

In dev it's derived; in prod you should set it explicitly.

### 4. Configure Supabase redirect URLs

Supabase Dashboard → **Auth → URL Configuration → Redirect URLs**. Add your
production origin + any preview origins (e.g. your Vercel preview URLs).

### 5. Register webhooks with correct URLs

Each provider's webhook must point at your deployed origin:

- Stripe: `https://yourapp.com/api/webhooks/stripe`
- Razorpay: `https://yourapp.com/api/webhooks/razorpay`
- Resend: `https://yourapp.com/api/webhooks/resend`

---

## Vercel (recommended)

The template is built for Vercel — it's a Next.js app, so `vercel deploy`
just works.

### Setup

1. Push your repo to GitHub/GitLab/Bitbucket.
2. Vercel → **New Project** → import the repo. Vercel auto-detects Next.js.
3. **Settings → Environment Variables** — add every var from your `.env.local`,
   scoping each to **Production** and/or **Preview**.

### Environment scoping

Vercel lets you scope each env var to **Production**, **Preview**, or
**Development**:

| Scope       | When it applies                               |
| ----------- | --------------------------------------------- |
| Production  | Merges to `main` / production deploys.        |
| Preview     | PR deploys, branch deploys (non-production).  |
| Development | Local `vercel dev` (pulls into `.env.local`). |

Best practice:

- **Use separate Supabase projects** for preview vs production. Same schema,
  different data + keys. This keeps test signups out of prod auth.
- **Stripe/Razorpay/Resend:** use test mode keys for Preview, live keys for
  Production.
- **PostHog/Sentry:** can share a project (use environment tags) or separate
  them.

### `NEXT_PUBLIC_*` vars need a redeploy

Public vars are inlined at build time. After changing one in the dashboard,
trigger a new deployment (Vercel does this automatically when you change a
Production var, but double-check).

### Migrations on deploy

Vercel doesn't run migrations automatically. Options:

1. **Manual:** run `bun run db:migrate` against prod from your machine after
   each deploy that includes a schema change.
2. **CI step:** add a migration step to your deploy workflow (see below).
3. **Supabase:** if you use Supabase's CLI, push migrations through their
   pipeline instead.

### Build command

The default (`next build`) works. No custom build command needed.

---

## Self-hosted (Docker / VPS)

### Build the image

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1 AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Run with env

```bash
docker run --env-file .env.production \
  -p 3000:3000 \
  your-image
```

Never bake secrets into the image. The `.env.production` file lives on the
host (gitignored) or in your orchestrator's secret store.

### Behind a reverse proxy

If you're behind nginx/Caddy/Cloudflare:

- The app reads `x-forwarded-for` for client IP (rate limiting, audit logs).
  Make sure your proxy sets it.
- Terminate TLS at the proxy. The `Strict-Transport-Security` header is sent
  regardless, so the proxy must force HTTPS.
- For webhooks (Stripe/Razorpay/Resend), the proxy must forward to
  `/api/webhooks/*` — these are excluded from the middleware matcher.

### Serverless caveat

The Drizzle client uses `postgres-js` (TCP), which **doesn't work in the Edge
runtime**. If you deploy any route with `export const runtime = "edge"`, that
route can't use `db`. Use Node runtime (the default) for anything touching the
DB. For edge + DB, switch to `@neondatabase/serverless` (HTTP driver).

---

## CI (GitHub Actions)

For builds, you need at least the `NEXT_PUBLIC_*` vars (they're inlined).
Server-only vars aren't needed for `next build` unless your build fetches data.

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run check
      - run: bun run test
      - run: bun run test:e2e
        env:
          CI: "true"
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          # ... etc for E2E
```

---

## Post-deploy checklist

- [ ] Site loads at production origin without env errors.
- [ ] Sign up → email confirmation → sign in works.
- [ ] `NEXT_PUBLIC_APP_URL` correct in page source (canonical URL).
- [ ] `/sitemap.xml`, `/robots.txt` return expected content.
- [ ] Webhooks verified (Stripe/Razorpay/Resend each show successful delivery).
- [ ] CSP header present (check with `curl -I` or browser devtools).
- [ ] Rate limiting works (hit a limit, get a 429).
- [ ] PostHog receives events (check your PostHog dashboard).
- [ ] Sentry receives errors (throw a test error, check Sentry).
- [ ] Migrations applied (`bun run db:migrate` against prod if needed).

---

## Common issues

### "NEXT_PUBLIC_* var didn't update"

Public vars are inlined at build. Redeploy after changing them.

### "Webhooks return 401/403"

The webhook secret in your env doesn't match the one in the provider
dashboard. Re-copy it. Also verify the URL is correct and reachable.

### "Webhooks return 503 'Stripe/Resend is not configured'"

The provider's `*_SECRET_KEY` / `*_WEBHOOK_SECRET` env var isn't set on the
deploy. The handlers return a clean 503 (rather than a 500 crash) when a
provider is unconfigured — set both the secret key and webhook secret and
redeploy.

### "Rate limit throws in production"

You deployed without Upstash. Set `UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN` and redeploy.

### "OAuth redirects to localhost"

`NEXT_PUBLIC_APP_URL` or the Supabase redirect URL config is wrong. Set both
to your production origin.

### "Edge route can't reach the DB"

`postgres-js` needs TCP, which Edge lacks. Use Node runtime for DB routes, or
switch to `@neondatabase/serverless`.
