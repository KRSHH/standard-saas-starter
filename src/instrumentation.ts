import * as Sentry from "@sentry/nextjs";

// Sentry instrumentation — dynamically loads the runtime-specific config.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Capture errors from Server Components, middleware, and route handlers.
export const onRequestError = Sentry.captureRequestError;
