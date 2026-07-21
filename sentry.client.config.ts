/**
 * Sentry client config — for the Sentry Next.js wizard (run `npx @sentry/wizard@latest -i nextjs`).
 * Wired by @sentry/nextjs via instrumentation.ts. Add client-side sampling here.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.SENTRY_DSN,
  // Replay for session debugging on errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
