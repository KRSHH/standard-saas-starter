# Next.js SaaS Template

A production-grade Next.js SaaS starter — auth, billing, observability, security,
testing, and SEO, all wired and verified. Clone, configure, ship.

> Every layer is the latest stable (verified July 2026). Built with context7-checked
> patterns, not guesses.

## What's included

| Area      | Choice                                   | Version    |
| --------- | ---------------------------------------- | ---------- |
| Framework | Next.js (App Router) — Turbopack         | 16.2       |
| Language  | TypeScript (strict)                      | 7.0        |
| UI        | Tailwind v4 + shadcn/ui (Radix)          | 4.3        |
| Auth      | Supabase SSR (cookie-based PKCE)         | 0.12       |
| Database  | Postgres + Drizzle ORM                   | 0.45       |
| Billing   | Razorpay + Stripe (webhooks, idempotent) | 2.9 / 22.3 |
| Email     | Resend + react-email                     | 6.17 / 6.9 |
| Analytics | PostHog (web + server)                   | 1.404      |
| Errors    | Sentry (replays + traces)                | 10.67      |
| Testing   | Vitest (unit) + Playwright (E2E)         | 4.1 / 1.61 |
| Lint      | ESLint 9 flat config + Prettier          | 9.34       |

## Highlights

- **Security baseline**: strict CSP with per-request nonces, RLS on every table,
  revoked default privileges, webhook signature verification + idempotency,
  rate limiting, full security header bundle (HSTS, X-Frame-Options, etc.).
- **Server-authoritative billing**: subscription status is written ONLY by
  webhook handlers into `app.subscriptions`; the client never reads plan/status
  except via authenticated server calls.
- **SEO**: metadata defaults, dynamic OG image (edge), JSON-LD, sitemap, robots,
  PWA manifest, canonical URLs.
- **Observability**: PostHog + Sentry + `/api/health` (DB ping).
- **DX**: Bun, VSCode settings, `.editorconfig`, `.nvmrc`, strict TS, flat ESLint,
  Prettier with Tailwind class sorting.

## Quick start

```bash
# 1. Install (Bun recommended; npm/pnpm also work)
bun install

# 2. Configure env
cp .env.example .env.local
# Fill in at least NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL

# 3. Apply the schema + RLS migration
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql

# 4. (Optional) Seed dev data
bun run db:seed

# 5. Dev
bun run dev
```

## Scripts

| Command               | What it does                            |
| --------------------- | --------------------------------------- |
| `bun run dev`         | Next dev (Turbopack) on :3000           |
| `bun run build`       | Production build (Turbopack)            |
| `bun run start`       | Serve the production build              |
| `bun run typecheck`   | `tsc --noEmit`                          |
| `bun run lint`        | ESLint (flat config)                    |
| `bun run test`        | Vitest unit tests                       |
| `bun run test:e2e`    | Playwright E2E (spins up dev server)    |
| `bun run db:generate` | Generate Drizzle migration from schema  |
| `bun run db:push`     | Push schema directly (dev only)         |
| `bun run db:seed`     | Seed dev data (2 profiles + subs + org) |

> **Production rate limiting:** configure `UPSTASH_REDIS_REST_URL` and
> `UPSTASH_REDIS_REST_TOKEN`. The in-memory limiter is development-only;
> production intentionally fails closed when distributed storage is missing.

## Structure

```
src/
├── app/                      # App Router
│   ├── (marketing)/          # Public site (home, pricing, features)
│   ├── (auth)/               # Sign-in / sign-up
│   ├── app/                  # Protected dashboard (auth-gated)
│   ├── api/                  # health, webhooks/{razorpay,stripe}
│   ├── layout.tsx            # Root (fonts, metadata, providers, nonce)
│   ├── globals.css           # Tailwind v4 + design tokens
│   ├── {error,global-error,loading,not-found}.tsx
│   ├── {sitemap,robots,manifest}.ts
│   └── opengraph-image.tsx   # Dynamic OG (edge)
├── components/
│   ├── ui/                   # shadcn/ui primitives (owned, MIT-style)
│   ├── marketing/            # Site nav + footer
│   ├── dashboard/            # Sidebar + user menu + theme toggle
│   ├── auth/                 # Auth form (react-hook-form + zod)
│   ├── seo/                  # JSON-LD
│   └── providers/            # PostHog
├── lib/
│   ├── supabase/             # SSR adapters: client, server, admin
│   ├── db/                   # Drizzle schema + client + seed
│   ├── payments/             # Razorpay, Stripe, plans, subscriptions, idempotency
│   ├── email/                # Resend client + send helpers
│   ├── analytics/            # PostHog server
│   ├── security/             # CSP, rate limiting
│   ├── auth.ts               # getCurrentUser / getCurrentProfile
│   ├── site.ts               # Branding + SEO — single source of truth
│   └── seo.ts                # buildMetadata helper
├── emails/                   # react-email templates
└── instrumentation.ts        # Sentry server init
```

## Customizing

1. **Brand**: edit `src/lib/site.ts` (name, title, description, keywords, links).
   The brand initial is used for the logo monogram everywhere.
2. **Plans**: edit `src/lib/payments/plans.ts` (Starter/Pro → your tiers, USD/INR).
3. **Schema**: edit `src/db/schema.ts` + `supabase/migrations/0001_init.sql`
   (the `app` schema, profiles, subscriptions, organizations — rename columns
   or tables for your domain).
4. **Email**: edit `src/emails/welcome.tsx` + `src/lib/email/send.ts`.

## License

MIT — use it for anything, including commercial.
