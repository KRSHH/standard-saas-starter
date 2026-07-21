import * as Sentry from "@sentry/nextjs";

/**
 * Edge-runtime Sentry init.
 * Imported dynamically by instrumentation.ts only in the Edge runtime.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!process.env.SENTRY_DSN,
});
