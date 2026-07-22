import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

// Client-side Sentry init. Next 16 auto-loads this (instrumentation-client
// convention). The DSN must be NEXT_PUBLIC_* to be inlined into the bundle.
Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
});

/** Instrument App Router navigations. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
