import crypto from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay client (server-only). Popular in India; supports UPI, cards, netbanking.
 * Lazily initialized so missing keys don't crash dev/test environments.
 */
let client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay keys not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

/**
 * Verify a Razorpay webhook signature (HMAC SHA256).
 * Used in /api/webhooks/razorpay to authenticate events.
 *
 * @returns true if the signature matches the payload + secret.
 */
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Timing-safe comparison
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
