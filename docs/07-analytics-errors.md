# 07 — Analytics & Errors

PostHog for product analytics (web + server) and Sentry for error tracking
(replays + traces). Both are **opt-in** — when their keys are missing, they
silently no-op.

---

## PostHog

### Browser (web)

`src/components/providers/posthog.tsx` initializes PostHog in a `useEffect`
and wraps children in `PostHogProvider`. Lazy: if `NEXT_PUBLIC_POSTHOG_KEY` is
missing, it renders children without initializing.

```ts
posthog.init(key, {
  api_host: host,
  person_profiles: "identified_only",
  capture_pageview: true, // auto pageviews
  capture_exceptions: true, // uncaught errors
});
```

Identify users after sign-in for cross-session attribution (add
`posthog.identify(user.id)` in your auth callback if you want it).

### Server

`src/lib/analytics/posthog-server.ts` — `getPostHogServer()` returns a `PostHog`
instance (or `null` if unconfigured). `trackServerEvent(name, props, id?)` is
the fire-and-forget helper for webhooks, cron, server actions:

```ts
import { trackServerEvent } from "@/lib/analytics/posthog-server";

await trackServerEvent("subscription_created", { plan: "pro" }, user.id);
```

Like the audit helper, it never throws — analytics must not break the request.

### CSP integration

`NEXT_PUBLIC_POSTHOG_HOST` is added to the CSP `connect-src` allowlist in
`src/lib/security/csp.ts`. If you change PostHog hosts, that's handled
automatically.

### Configuration

| Var                        | Where        | Purpose                                                       |
| -------------------------- | ------------ | ------------------------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`  | `.env.local` | Project API key.                                              |
| `NEXT_PUBLIC_POSTHOG_HOST` | `.env.local` | Host (`https://app.posthog.com` or self-hosted). Also in CSP. |
| `POSTHOG_PERSONAL_API_KEY` | `.env.local` | Optional, for server-side queries/exports.                    |

Get keys from PostHog → **Project Settings**.

---

## Sentry

### Setup

Three config files, one per runtime (Next.js standard):

| File                      | Runtime | Purpose                  |
| ------------------------- | ------- | ------------------------ |
| `sentry.client.config.ts` | Browser | Replays + client errors. |
| `sentry.server.config.ts` | Node    | Server errors + traces.  |
| `sentry.edge.config.ts`   | Edge    | Edge runtime errors.     |

`src/instrumentation.ts` dynamically imports the right config based on
`NEXT_RUNTIME`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs")
    await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge")
    await import("../sentry.edge.config");
}

export const onRequestError = Sentry.captureRequestError;
```

`onRequestError` is the Next.js instrumentation hook that captures errors from
Server Components, middleware (`proxy.ts`), and Route Handlers.

> Verified: this is the `@sentry/nextjs` v10 + Next.js 16 instrumentation
> pattern from the Sentry manual-setup docs.

### Disabled when no DSN

```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

If `SENTRY_DSN` is unset, Sentry is disabled — no errors, no traces.

### Source maps (build-time)

`SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are used by
`@sentry/nextjs` at build time to upload source maps (so production stack
traces are readable). These live in `.sentryclirc` (gitignored). Get the auth
token from Sentry → **Settings → Auth Tokens**.

### CSP integration

Sentry ingest origins are hard-coded into the CSP in `src/lib/security/csp.ts`:
`https://*.sentry.io https://*.ingest.sentry.io`.

---

## When to use which

| You want to know...                           | Use                          |
| --------------------------------------------- | ---------------------------- |
| How users move through your app               | PostHog                      |
| Feature adoption / funnel conversion          | PostHog                      |
| Server-side business events (signup, upgrade) | PostHog (`trackServerEvent`) |
| A bug causing errors                          | Sentry                       |
| What the user did right before a crash        | Sentry Session Replay        |
| Slow server requests / DB queries             | Sentry Performance (traces)  |

PostHog also has error tracking (`capture_exceptions: true`), but Sentry gives
you source maps, release health, and replay. They complement each other.

---

## Fire-and-forget convention

Both the PostHog and Sentry helpers are designed to **never break the user's
request**:

- `trackServerEvent` — no-ops if PostHog is unconfigured; swallows errors.
- `logAudit` — catches insert errors and warns; never re-throws.

When you call them, you don't need try/catch — but they're also not guaranteed.
Don't use them for anything the user needs to succeed.

---

## Common tasks

### Track a custom event

```ts
// Client
import posthog from "posthog-js";
posthog.capture("upgrade_clicked", { plan: "pro" });

// Server
import { trackServerEvent } from "@/lib/analytics/posthog-server";
await trackServerEvent("subscription_created", { plan: "pro" }, user.id);
```

### Capture a caught error to Sentry

```ts
import * as Sentry from "@sentry/nextjs";

try {
  await riskyThing();
} catch (error) {
  Sentry.captureException(error);
  // return a graceful response
}
```

> **Important:** for errors you catch and handle gracefully (Server Actions,
> API routes), you must call `captureException` manually — Next only auto-captures
> **unhandled** errors.

### Change the trace sample rate

Edit `tracesSampleRate` in the three sentry config files. `0.1` = 10% of
transactions traced. Lower for high-traffic apps to control cost.

### Disable Sentry in a specific environment

Unset `SENTRY_DSN` (the `enabled` flag handles it). For a hard disable without
removing the var, set `enabled: false` in the config files.
