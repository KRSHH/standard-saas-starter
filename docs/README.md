# Documentation

Guides for building on this Next.js SaaS template. Each file covers one area —
read what you need, skip what you don't. Start with **Getting Started**, then
**Environment Variables**.

## Guides

| # | Guide | What it covers |
|---|-------|----------------|
| 01 | [Getting Started](./01-getting-started.md) | Clone, install, configure, run. The 5-minute path to a working local dev server. |
| 02 | [Environment Variables](./02-environment-variables.md) | Every env var, what it does, where it's read, and how to configure it across local / preview / staging / production. **Start here for env questions.** |
| 03 | [Database & Schema](./03-database.md) | Drizzle ORM, the `app` schema, RLS policies, migrations, and the seed script. |
| 04 | [Authentication](./04-authentication.md) | Supabase Auth (cookie-based PKCE), email/password, OAuth providers, reauthentication, account lifecycle. |
| 05 | [Billing](./05-billing.md) | Stripe + Razorpay setup, plans, checkout, webhooks, and idempotency. |
| 06 | [Email & Notifications](./06-email-notifications.md) | Resend, react-email templates, in-app + email notifications, unsubscribe flow. |
| 07 | [Analytics & Errors](./07-analytics-errors.md) | PostHog (web + server) and Sentry (replays + traces). |
| 08 | [Security](./08-security.md) | CSP with per-request nonce, rate limiting, Turnstile, security headers, audit logging. |
| 09 | [Testing](./09-testing.md) | Vitest unit tests and Playwright E2E. |
| 10 | [Deployment](./10-deployment.md) | Vercel and self-hosted (Docker/VPS). How env vars reach each environment. |
| 11 | [Architecture & Conventions](./11-architecture.md) | Directory structure, routing groups, naming, and the patterns the codebase follows. |

## How to read these

- **You just cloned the template** → 01, then 02 for the crash you'll hit without Supabase.
- **You're configuring a provider** → jump to the matching guide (03–07).
- **You're shipping to prod** → 02 (env), then 10 (deployment), then 08 (security review).
- **You want to understand the codebase** → 11 (architecture), then the area guides.

## Conventions used in these docs

- **Required** means the app throws on first use if the var is missing.
- **Optional** means the feature degrades gracefully (lazy init, no-op, or hidden UI).
- File references use `path/to/file.ts` and are clickable in most editors.
- Env var names are written exactly as they appear in `.env.example`.
