/**
 * Pricing config — single source of truth for plans.
 *
 * The template ships two generic tiers (Starter / Pro) in USD. Swap the
 * amounts, currency, and feature copy for your product. To bill in INR
 * via Razorpay, change `currency` to "inr" and amounts to paise (₹1 = 100).
 *
 * Gateway plan/price IDs are created in each provider's dashboard and
 * pasted into env vars. Until then, checkout falls back to ad-hoc creation.
 */
export const PLANS = {
  starter: {
    name: "Starter",
    slug: "starter" as const,
    priceUsd: 19,
    priceCents: 1900, // $19.00
    currency: "usd" as const,
    interval: "monthly" as const,
    description: "For individuals and small teams getting started.",
    razorpayPlanId: process.env.RAZORPAY_STARTER_PLAN_ID,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "Up to 3 projects",
      "Community support",
      "5 GB storage",
      "Core dashboard",
    ],
  },
  pro: {
    name: "Pro",
    slug: "pro" as const,
    priceUsd: 49,
    priceCents: 4900, // $49.00
    currency: "usd" as const,
    interval: "monthly" as const,
    description: "For growing teams that need more power and support.",
    razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "Unlimited projects",
      "Priority support",
      "50 GB storage",
      "Advanced analytics",
      "Advanced team controls",
    ],
  },
} as const;

export type PlanSlug = keyof typeof PLANS;
export type Plan = (typeof PLANS)[PlanSlug];

/** Free trial length in days. */
export const TRIAL_DAYS = 14;
