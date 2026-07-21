import { PostHog } from "posthog-node";

/**
 * PostHog server client — for server-side events (webhooks, cron, server actions).
 * The browser client is initialized in components/providers/posthog.tsx.
 *
 * Lazily initialized so missing keys don't crash dev/test environments.
 */
let client: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return null;

  if (!client) {
    client = new PostHog(key, { host });
  }
  return client;
}

/** Track a server-side event. No-op if PostHog isn't configured. */
export function trackServerEvent(
  event: string,
  properties?: Record<string, unknown>,
  distinctId?: string,
) {
  const ph = getPostHogServer();
  if (!ph) return;
  ph.capture({
    event,
    properties,
    distinctId: distinctId ?? "anonymous",
  });
}
