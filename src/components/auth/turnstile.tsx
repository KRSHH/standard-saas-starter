"use client";

import * as React from "react";
import Script from "next/script";

/**
 * Cloudflare Turnstile widget — optional bot protection for auth forms.
 *
 * Opt-in: set NEXT_PUBLIC_TURNSTILE_SITE_KEY (client) and enable captcha in
 * the Supabase dashboard (Auth → Settings → Bot & Abuse). When the site key
 * is unset this component renders nothing, so forms work zero-config.
 *
 * On success the token is handed to the parent via `onToken`. Pass it to the
 * Supabase auth call as `options.captchaToken` — Supabase verifies it
 * server-side; no separate verification endpoint needed.
 *
 * @see https://developers.cloudflare.com/turnstile/
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onToken,
  resetSignal = 0,
}: {
  /** Receives the challenge token, or null when it expires/errors. */
  onToken: (token: string | null) => void;
  /** Bump after a failed auth call — tokens are single-use, so the widget
   *  must issue a fresh one before the user can retry. */
  resetSignal?: number;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);

  const renderWidget = React.useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onToken,
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });
  }, [siteKey, onToken]);

  React.useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  React.useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onToken(null);
    }
  }, [resetSignal, onToken]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div ref={containerRef} />
    </>
  );
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}
