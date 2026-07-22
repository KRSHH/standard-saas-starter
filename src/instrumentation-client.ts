import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init — Next 16 loads this file automatically on the
 * browser (instrumentation-client convention; replaces the legacy
 * sentry.client.config.ts, which nothing loads without withSentryConfig).
 *
 * The DSN must be NEXT_PUBLIC_* to be inlined into the client bundle.
 * DSNs are safe to expose — they only allow event submission.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!dsn,
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

/** Instrument App Router navigations. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
