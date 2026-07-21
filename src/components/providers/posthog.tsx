"use client";

import * as React from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

export function PostHogProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  React.useEffect(() => {
    if (!key || !host) return;
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true, // note: singular in this version
      capture_exceptions: true,
      // nonce is applied to scripts via the host page's CSP, not here.
    });
  }, [key, host, nonce]);

  // PostHog React provider requires apiKey explicitly.
  if (!key) return <>{children}</>;

  return <PHProvider apiKey={key}>{children}</PHProvider>;
}
