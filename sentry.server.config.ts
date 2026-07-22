import * as Sentry from "@sentry/nextjs";

import { env } from "./src/lib/env";

// Server-side Sentry init — loaded by instrumentation.ts in the Node runtime.
Sentry.init({
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: Boolean(env.NEXT_PUBLIC_SENTRY_DSN),
});
