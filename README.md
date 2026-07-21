# Next.js SaaS Template

Next.js SaaS starter - auth, billing, observability, security,
testing, and SEO, all wired.

## What's included

| Area      | Choice                                   | Version    |
| --------- | ---------------------------------------- | ---------- |
| Framework | Next.js (App Router) — Turbopack         | 16.2       |
| Language  | TypeScript (strict)                      | 7.0        |
| UI        | Tailwind v4 + shadcn/ui (Radix)          | 4.3        |
| Auth      | Supabase SSR (cookie-based PKCE)         | 0.12       |
| Database  | Postgres + Drizzle ORM (RLS-declarative) | 0.45       |
| Billing   | Razorpay + Stripe (webhooks, idempotent) | 2.9 / 22.3 |
| Email     | Resend + react-email                     | 6.17 / 6.9 |
| Analytics | PostHog (web + server)                   | 1.404      |
| Errors    | Sentry (replays + traces)                | 10.67      |
| Testing   | Vitest (unit) + Playwright (E2E)         | 4.1 / 1.61 |
| Lint      | ESLint 9 flat config + Prettier          | 9.34       |

## Quick start

```bash
# 1. Install (Bun recommended; npm/pnpm also work)
bun install

# 2. Configure env
cp .env.example .env.local
# Fill in at least NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL

# 3. Apply schema + RLS migrations (tables, policies, triggers, storage bucket)
bun run db:migrate

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
| `bun run db:custom`   | Empty custom migration (triggers/SQL)   |
| `bun run db:migrate`  | Apply pending Drizzle migrations        |
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
│   ├── (legal)/              # Privacy, Terms, Cookies, Contact (placeholder copy)
│   ├── (auth)/               # Sign-in / sign-up / forgot / reset / check-email
│   ├── app/                  # Protected dashboard (auth-gated) + settings tabs
│   ├── api/                  # health, uploads, notifications, webhooks/{razorpay,stripe,resend}
│   ├── layout.tsx            # Root (fonts, metadata, providers, nonce)
│   ├── globals.css           # Tailwind v4 + design tokens
│   ├── {error,global-error,loading,not-found}.tsx
│   ├── {sitemap,robots,manifest}.ts
│   └── opengraph-image.tsx   # Dynamic OG (edge)
├── components/
│   ├── ui/                   # shadcn/ui primitives (owned, MIT-style)
│   ├── marketing/            # Site nav + footer
│   ├── dashboard/            # Sidebar + user menu + theme toggle + notification bell
│   ├── auth/                 # Auth forms (react-hook-form + zod)
│   ├── settings/             # Profile / Account / Security / Linked-accounts sub-forms
│   ├── seo/                  # JSON-LD
│   └── providers/            # PostHog
├── lib/
│   ├── supabase/             # SSR adapters: client, server, admin
│   ├── db/                   # Drizzle schema (RLS-declarative) + client + seed
│   ├── payments/             # Razorpay, Stripe, plans, subscriptions, idempotency
│   ├── notifications/        # Store, dispatcher, unsubscribe tokens
│   ├── uploads/              # Signed URLs, paths, quota, scanner extension point
│   ├── audit/                # logAudit + client action + actions registry + sanitizer
│   ├── auth/                 # Server actions + OAuth provider registry
│   ├── email/                # Resend client + send helpers
│   ├── analytics/            # PostHog server
│   ├── security/             # CSP, rate limiting, Turnstile
│   ├── auth.ts               # getCurrentUser / getCurrentProfile
│   ├── site.ts               # Branding + SEO — single source of truth
│   └── seo.ts                # buildMetadata helper
├── emails/                   # react-email templates (welcome, notification)
└── instrumentation.ts        # Sentry server init
```

## License

MIT — use it for anything, including commercial.
