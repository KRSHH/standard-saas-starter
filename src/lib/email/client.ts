import { Resend } from "resend";

import { env } from "@/lib/env";

// Resend client (server-only). Singleton survives HMR in dev.
const globalForResend = globalThis as unknown as { __resend?: Resend };

export const resend: Resend | null = env.RESEND_API_KEY
  ? (globalForResend.__resend ??= new Resend(env.RESEND_API_KEY))
  : null;

/** Throws if Resend isn't configured. */
export function getResend(): Resend {
  if (!resend) throw new Error("RESEND_API_KEY is not configured");
  return resend;
}

export const emailFrom = env.EMAIL_FROM ?? `Acme <onboarding@resend.dev>`;
export const emailReplyTo = env.EMAIL_REPLY_TO ?? "hello@yourdomain.com";
