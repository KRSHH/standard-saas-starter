import { Resend } from "resend";

import { siteConfig } from "@/lib/site";

/**
 * Resend client (server-only). Lazily initialized so missing keys
 * don't crash dev/test environments.
 */
let client: Resend | null = null;

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Resend key not set. Add RESEND_API_KEY.");
  }
  if (!client) client = new Resend(key);
  return client;
}

/** Canonical "from" address. Falls back to Resend's sandbox sender. */
export const emailFrom =
  process.env.EMAIL_FROM ?? `Acme <onboarding@resend.dev>`;
export const emailReplyTo =
  process.env.EMAIL_REPLY_TO ?? "hello@yourdomain.com";

/** Domain verification helper for Resend. */
export const appDomain = new URL(siteConfig.url).hostname;
