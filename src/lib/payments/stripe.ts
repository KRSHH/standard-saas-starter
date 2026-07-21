import Stripe from "stripe";

/**
 * Stripe client (server-only). Global payments gateway.
 * Lazily initialized so missing keys don't crash dev/test environments.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe key not set. Add STRIPE_SECRET_KEY.");
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}
