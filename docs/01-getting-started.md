# 01 — Getting Started

Get a working local dev server in ~5 minutes. You need a Supabase project for
the app to start (auth + database). Everything else (payments, email,
analytics) is optional and can be added later.

> **See a `NEXT_PUBLIC_SUPABASE_URL is required` error?** That's fail-fast —
> the middleware (`src/proxy.ts`) runs on every request and needs Supabase.
> Follow Step 2 below to configure it. This is the intended behavior, not a bug.

## Prerequisites

| Requirement        | Version             | Why                                                                              |
| ------------------ | ------------------- | -------------------------------------------------------------------------------- |
| Node.js            | >= 20.9.0           | Next.js 16 runtime floor (see `package.json` `engines`).                         |
| Bun                | 1.3.0 (recommended) | The template pins `packageManager: bun@1.3.0`. npm/pnpm also work.               |
| A Supabase project | free tier is fine   | Auth, Postgres, and Storage. Create one at [supabase.com](https://supabase.com). |

You don't need Stripe, Resend, PostHog, Sentry, or Upstash to start. Those are
lazily-initialized — see [Environment Variables](./02-environment-variables.md).

## Step 1 — Install

```bash
bun install
```

With npm:

```bash
npm install
```

## Step 2 — Create a Supabase project and get your keys

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Once created, open **Project Settings → API**. You need three values:
   - **Project URL** — e.g. `https://abcdefgh.supabase.co`
   - **anon public key** — the `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** — the `SUPABASE_SERVICE_ROLE_KEY` (server-only, secret)
3. Open **Project Settings → Database → Connection string → Direct connection**
   (port `5432`). This is your `DATABASE_URL`. Replace `[YOUR-PASSWORD]` with
   the database password you set when creating the project.

> **Which connection string?** Use the **direct** connection (port 5432) for
> migrations and local dev. For serverless production (Vercel), switch to the
> **pooler** / pgBouncer connection (port 6543). See
> [Database](./03-database.md#connection-strings).

## Step 3 — Create your `.env.local`

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in **at minimum** these three (everything else
can stay as placeholder for now):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your-service-role-key...

DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.abcdefgh.supabase.co:5432/postgres
```

> `.env.local` is gitignored — it never gets committed. See
> [Environment Variables](./02-environment-variables.md) for the full model.

## Step 4 — Apply the database schema

```bash
bun run db:migrate
```

This runs the Drizzle migrations in `drizzle/` against your Supabase Postgres.
It creates the `app` schema, tables, RLS policies, triggers, and the storage
bucket. See [Database](./03-database.md).

## Step 5 — (Optional) Seed dev data

```bash
bun run db:seed
```

Creates two sample profiles (Alice / Bob), matching `trialing` subscriptions,
and one organization. Safe to re-run. See [Database → Seed](./03-database.md#seed).

## Step 6 — Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the
marketing page. Sign up at `/sign-up` — the auth flow uses Supabase email
confirmation by default.

## Next steps

- **Configure more providers** (Stripe, Resend, PostHog…) — see
  [Environment Variables](./02-environment-variables.md), each var is annotated
  with whether it's required or optional.
- **Understand the codebase layout** — see [Architecture](./11-architecture.md).
- **Rebrand** — edit `src/lib/site.ts` and the `NEXT_PUBLIC_APP_*` env vars.
- **Change the pricing** — edit `src/lib/payments/plans.ts`.

## Troubleshooting

**`NEXT_PUBLIC_SUPABASE_URL is required`** — `.env.local` is missing or the
Supabase vars aren't filled in. Re-do Step 3.

**Migration fails with connection error** — your `DATABASE_URL` password or
host is wrong, or your IP isn't allowed. Supabase restricts DB access by
default; check **Database → Network restrictions**.

**`Error: UPSTASH_REDIS_REST_URL ... are required in production`** — rate
limiting fails closed in production. Either add Upstash or stay in dev. See
[Security → Rate limiting](./08-security.md#rate-limiting).

**OAuth buttons do nothing** — you haven't enabled the provider in Supabase.
See [Authentication → OAuth](./04-authentication.md#oauth-providers).
