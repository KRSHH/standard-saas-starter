import * as Sentry from "@sentry/nextjs";

/**
 * Server-side Sentry init.
 * Imported dynamically by instrumentation.ts only in the Node runtime.
 */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: !!dsn,
});
