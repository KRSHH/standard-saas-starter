import Stripe from "stripe";

import { env } from "@/lib/env";

// Stripe client (server-only). Singleton survives HMR in dev.
const globalForStripe = globalThis as unknown as { __stripe?: Stripe };

export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
  ? (globalForStripe.__stripe ??= new Stripe(env.STRIPE_SECRET_KEY))
  : null;

/** Throws if Stripe isn't configured — use in webhook handlers. */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return stripe;
}
