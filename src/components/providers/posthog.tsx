"use client";

import * as React from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

import { env } from "@/lib/env";

export function PostHogProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = env.NEXT_PUBLIC_POSTHOG_HOST;

  React.useEffect(() => {
    if (!key || !host) return;
    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_exceptions: true,
    });
  }, [key, host, nonce]);

  if (!key) return <>{children}</>;
  return <PHProvider apiKey={key}>{children}</PHProvider>;
}
