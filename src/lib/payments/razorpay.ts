import crypto from "node:crypto";

import { env } from "@/lib/env";

// Verify a Razorpay webhook signature (HMAC SHA256).
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
