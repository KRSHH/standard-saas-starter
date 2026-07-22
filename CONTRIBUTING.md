# Contributing

Thanks for helping improve this template! It aims to stay **lean and universal** —
the bar for new features is "most SaaS projects need this." Fixes, upgrades, and
DX improvements are always welcome.

## Getting started

```bash
git clone https://github.com/fritzhand/nextjs-template.git
cd nextjs-template
bun install
cp .env.example .env.local   # fill in Supabase + DATABASE_URL at minimum
bun run dev
```

## Before you open a PR

```bash
bun run check   # typecheck + lint + format check
bun run test    # unit tests (Vitest)
```

Both must pass — CI runs the same commands plus a production build and
Playwright E2E.

## Guidelines

- **Keep it plug-and-play.** Optional integrations (Sentry, PostHog, Stripe,
  Razorpay, Resend, Turnstile, Upstash) must degrade gracefully when their env
  vars are unset. Never make an optional service required.
- **Update the docs with the code.** If you add an env var, document it in
  `.env.example`. If you change behavior or scripts, update the README.
- **Match the existing style.** Prettier and ESLint are the source of truth;
  `bun run lint:fix && bun run format` before committing.
- **Schema changes** go through Drizzle: edit `src/db/schema.ts`, then
  `bun run db:generate` (or `bun run db:custom` for raw SQL like triggers).
  Never hand-edit applied migrations.
- **Security-sensitive areas** (auth flows, webhooks, RLS policies, CSP, rate
  limiting) get extra scrutiny — explain your reasoning in the PR description.

## Reporting bugs

Use the [bug report template](https://github.com/fritzhand/nextjs-template/issues/new?template=bug_report.yml).
For security vulnerabilities, see [SECURITY.md](SECURITY.md) — please don't open
a public issue.
