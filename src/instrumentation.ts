import * as Sentry from "@sentry/nextjs";

/**
 * Sentry server config — registers server + edge configs per runtime.
 * Uses dynamic import so each runtime only loads its own config.
 *
 * Pattern verified against @sentry/nextjs v10 + Next 16 (context7).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

/** Capture errors from Server Components, middleware, and route handlers. */
export const onRequestError = Sentry.captureRequestError;
