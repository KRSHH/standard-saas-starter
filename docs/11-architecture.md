# 11 — Architecture & Conventions

How the codebase is organized and the patterns it follows. Read this once to
understand where everything lives and why.

---

## Directory structure

```
src/
├── app/                      # App Router (Next.js)
│   ├── (auth)/               # Route group: sign-in/sign-up/forgot/reset/check-email
│   ├── (legal)/              # Route group: privacy/terms/cookies/contact
│   ├── (marketing)/          # Route group: home/pricing/features
│   ├── app/                  # Protected dashboard (auth-gated by middleware)
│   ├── api/                  # Route Handlers
│   │   ├── health/           # Health check
│   │   ├── uploads/          # Signed upload URLs
│   │   ├── notifications/    # List/read/preferences/unsubscribe
│   │   └── webhooks/         # razorpay / stripe / resend
│   ├── auth/                 # callback, sign-out routes
│   ├── layout.tsx            # Root layout (metadata, providers, nonce)
│   ├── globals.css           # Tailwind v4 + design tokens
│   └── {error,global-error,loading,not-found}.tsx
│   └── {sitemap,robots,manifest,opengraph-image}.ts(x)
├── components/
│   ├── ui/                   # shadcn/ui primitives (Radix + cva)
│   ├── marketing/            # Site nav
│   ├── dashboard/            # Sidebar, user menu, notification bell
│   ├── auth/                 # Auth forms + Turnstile
│   ├── settings/             # Profile/account/security sub-forms
│   ├── seo/                  # JSON-LD
│   └── providers/            # PostHog provider
├── lib/
│   ├── supabase/             # server.ts, client.ts, admin.ts
│   ├── db/                   # index.ts (client), schema.ts, seed.ts
│   ├── payments/             # stripe, razorpay, plans, subscriptions, idempotency
│   ├── notifications/        # store, dispatch, tokens
│   ├── uploads/              # paths, quota, server
│   ├── audit/                # log, actions, sanitize, client
│   ├── auth/                 # actions (server actions), oauth-providers
│   ├── email/                # client (Resend), send helpers
│   ├── analytics/            # posthog-server
│   ├── security/             # csp, rate-limit
│   ├── auth.ts               # getCurrentUser / getCurrentProfile
│   ├── site.ts               # Branding + SEO (single source)
│   ├── seo.ts                # buildMetadata helper
│   └── env.ts                # requireEnv + Supabase env helper
├── emails/                   # react-email templates (welcome, notification)
├── instrumentation.ts        # Sentry server/edge init (dynamic import per NEXT_RUNTIME)
├── instrumentation-client.ts # Sentry client init (browser replays — Next 16 convention)
└── proxy.ts                  # Middleware (CSP nonce, Supabase refresh, auth gate)
```

---

## Routing groups

Parenthesized folder names — `(auth)`, `(legal)`, `(marketing)` — are **route
groups**. They organize code without affecting the URL:

- `(auth)/sign-in/page.tsx` → `/sign-in`
- `(marketing)/pricing/page.tsx` → `/pricing`

Each route group has its own `layout.tsx` for group-specific chrome (auth has
a centered card layout; marketing has a nav + footer).

The `app/` directory (no parens) is the **protected dashboard** — its URL is
`/app/*`. The middleware gates it: unauthenticated requests redirect to
`/sign-in`.

---

## The middleware (`proxy.ts`)

Next.js looks for middleware in `src/middleware.ts` by default. This template
uses `src/proxy.ts` (the documented `middleware` config in `next.config.ts`
isn't needed in Next 16 — `proxy.ts` is auto-detected if exported). It runs
on every request matching:

```ts
matcher: [
  "/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|...)$).*)",
];
```

Excludes static assets, Next internals, and **webhooks** (webhooks do their
own signature verification and shouldn't be subject to the Supabase session
refresh or CSP nonce logic).

---

## Server vs client components

- **Server Components** (default): data fetching, DB access, secrets. No
  `"use client"`.
- **Client Components**: interactivity, hooks, browser APIs. Marked
  `"use client"`.

The template keeps client components small and pushes logic to server actions

- route handlers. Forms use react-hook-form on the client but submit to server
  actions or API routes for the actual work.

---

## Data access patterns

| Context                                   | Client                                        | RLS         |
| ----------------------------------------- | --------------------------------------------- | ----------- |
| Server Component / Action / Route Handler | Supabase server client (`createClient()`)     | ✅ Enforced |
| Client Component                          | Supabase browser client (`createClient()`)    | ✅ Enforced |
| Webhook / system action                   | Supabase admin client (`createAdminClient()`) | ❌ Bypassed |
| Server-authoritative write (typed)        | Drizzle `db` (`@/db`)                         | ❌ Bypassed |

> **Rule:** client components never import the admin client or the Drizzle
> `db`. Both are server-only. The Drizzle writes and admin client run as
> privileged roles that bypass RLS — exposing them to the browser would
> defeat the entire security model.

---

## Server Actions

`"use server"` files in `src/lib/auth/actions.ts`. Used for:

- Profile updates
- Account deletion
- OAuth link/unlink
- Resend verification

Each action: resolves the user (`getCurrentUser`), validates input, mutates
via the appropriate client, records an audit entry, and returns a typed result
(`{ ok: true } | { ok: false; error }`).

---

## Naming conventions

| Pattern         | Example                               | Meaning                                               |
| --------------- | ------------------------------------- | ----------------------------------------------------- |
| `getCurrent*`   | `getCurrentUser`, `getCurrentProfile` | Resolves the session user. Redirects or returns null. |
| `get*Client`    | `createClient`, `createAdminClient`   | Lazy-initialized provider clients.                    |
| `requireEnv`    | `requireEnv("X", process.env.X)`      | Fail-fast env validation.                             |
| `logAudit`      | `logAudit({...})`                     | Append-only audit write.                              |
| `is*Configured` | `isTurnstileConfigured`               | Boolean feature check.                                |
| `*Variants`     | `buttonVariants`                      | cva variant export (shadcn convention).               |

---

## Styling (Tailwind v4)

- No `tailwind.config.ts` — Tailwind v4 uses CSS-first config.
- `src/app/globals.css`: `@import "tailwindcss"`, `@theme inline { ... }`
  maps design tokens, `@custom-variant dark` for dark mode.
- `cn()` (`src/lib/utils.ts`) merges classnames via `clsx` + `tailwind-merge`.
- shadcn/ui components in `src/components/ui/` — owned (not a dependency),
  MIT-style. Customize freely.

Design tokens use `oklch()` color space for perceptual uniformity.

---

## State management

- **Server state:** Drizzle + Supabase (the source of truth).
- **Client server-state:** React Query (`@tanstack/react-query`). The
  notification bell is the main consumer.
- **URL state:** nuqs (`NuqsAdapter`) for query-string state.
- **Form state:** react-hook-form + zod.
- **Theme:** next-themes (class-based dark mode).

No Redux/Zustand — the template intentionally avoids global client state.
Server state belongs on the server; ephemeral client state is local.

---

## Configuration files

| File                              | Purpose                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                  | Next.js config (images, optimizePackageImports). Wrapped with `withSentryConfig` when `SENTRY_AUTH_TOKEN` is set (source-map upload). |
| `tsconfig.json`                   | TypeScript (strict, `@/*` path alias).                                                                                                |
| `drizzle.config.ts`               | Drizzle Kit (postgres, supabase migration prefix).                                                                                    |
| `eslint.config.mjs`               | ESLint 9 flat config (Next + TS + drizzle plugin).                                                                                    |
| `vitest.config.ts`                | Vitest (jsdom, coverage).                                                                                                             |
| `playwright.config.ts`            | Playwright (chromium, auto-start dev server).                                                                                         |
| `postcss.config.mjs`              | Tailwind v4 PostCSS plugin.                                                                                                           |
| `bunfig.toml`                     | Bun config (hoisted linker, peer deps).                                                                                               |
| `.prettierrc` / `.prettierignore` | Prettier.                                                                                                                             |

---

## Conventions to follow

### Adding a feature

1. **Server logic** → `src/lib/<area>/`.
2. **UI** → `src/components/<area>/` (or `src/components/ui/` for primitives).
3. **Route** → `src/app/<route>/page.tsx` or `src/app/api/<route>/route.ts`.
4. **Server Action** → `src/lib/<area>/actions.ts` with `"use server"`.
5. **Audit** new sensitive actions in `src/lib/audit/actions.ts`.

### Env vars

- Validate required vars with `requireEnv` at the point of use.
- Lazy-init optional provider clients (throw only when called).
- Document in `.env.example` and [docs/02](./02-environment-variables.md).
- Never prefix server secrets with `NEXT_PUBLIC_`.

### Database changes

- Edit `src/db/schema.ts`.
- `bun run db:generate` → review → commit the migration.
- `bun run db:migrate` to apply.
- Never use `db:push` in production.

### Tests

- Unit tests co-located (`*.test.ts`).
- E2E in `e2e/<area>.spec.ts`.
- `bun run check` before commit.

---

## Key principles

1. **Server-authoritative.** Subscription status, audit logs, notifications —
   all written server-side. The client is a view, not a source of truth.
2. **Fail fast on missing config.** Required env vars throw at startup, not
   silently degrade. Optional providers lazy-init.
3. **Best-effort for non-critical paths.** Audit, analytics, email never
   break the user's request — they catch + log.
4. **RLS as defense in depth.** Even if a client bug queries directly, RLS
   policies restrict what's visible. Service-role-only tables have no client
   policy at all.
5. **Single source of truth.** Site config in `site.ts`, plans in `plans.ts`,
   schema in `schema.ts`, env template in `.env.example`.
