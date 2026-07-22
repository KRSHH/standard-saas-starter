import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Typed, validated environment — the single source of truth.
 *
 * Read `env.X` everywhere instead of `process.env.X`. The schema validates at
 * startup and gives full autocompletion. Server vars throw if accessed on the
 * client; client vars are inlined into the browser bundle.
 *
 * Supabase Vercel integration aliases (POSTGRES_URL, SUPABASE_URL, …) are
 * resolved inside `runtimeEnv` — the one place that knows about them — so the
 * one-click integration works without manual aliasing.
 */
export const env = createEnv({
  isServer:
    typeof window === "undefined" ||
    process.env.NODE_ENV === "test" ||
    Boolean(process.env.VITEST),

  server: {
    DATABASE_URL: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    NOTIFICATIONS_UNSUBSCRIBE_SECRET: z.string().min(1).optional(),

    // Stripe (optional)
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_STARTER_PRICE_ID: z.string().min(1).optional(),
    STRIPE_PRO_PRICE_ID: z.string().min(1).optional(),

    // Razorpay (optional)
    RAZORPAY_KEY_ID: z.string().min(1).optional(),
    RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
    RAZORPAY_STARTER_PLAN_ID: z.string().min(1).optional(),
    RAZORPAY_PRO_PLAN_ID: z.string().min(1).optional(),

    // Resend email (optional)
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    EMAIL_REPLY_TO: z.string().min(1).optional(),

    // Upstash rate limiting (optional; required in production)
    UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  },

  client: {
    // Supabase public (required)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // App identity (optional, with dev defaults)
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Acme"),
    NEXT_PUBLIC_TWITTER_URL: z.string().url().optional(),
    NEXT_PUBLIC_GITHUB_URL: z.string().url().optional(),

    // PostHog (optional)
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).optional(),

    // Sentry (optional)
    NEXT_PUBLIC_SENTRY_DSN: z.string().min(1).optional(),

    // Cloudflare Turnstile (optional)
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  },

  /**
   * Map real process.env → schema. This is the ONLY place aliases live.
   * Canonical names win; integration aliases fill the gaps.
   */
  runtimeEnv: {
    // --- Database (direct → pooled fallback for migrations/runtime) ---
    DATABASE_URL:
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      process.env.POSTGRES_PRISMA_URL,

    // --- Supabase (auth) ---
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,

    // --- Notifications ---
    NOTIFICATIONS_UNSUBSCRIBE_SECRET:
      process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET,

    // --- Stripe ---
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_STARTER_PRICE_ID: process.env.STRIPE_STARTER_PRICE_ID,
    STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,

    // --- Razorpay ---
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_STARTER_PLAN_ID: process.env.RAZORPAY_STARTER_PLAN_ID,
    RAZORPAY_PRO_PLAN_ID: process.env.RAZORPAY_PRO_PLAN_ID,

    // --- Resend ---
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,

    // --- Upstash ---
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // --- App identity ---
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_TWITTER_URL: process.env.NEXT_PUBLIC_TWITTER_URL,
    NEXT_PUBLIC_GITHUB_URL: process.env.NEXT_PUBLIC_GITHUB_URL,

    // --- PostHog ---
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,

    // --- Sentry ---
    NEXT_PUBLIC_SENTRY_DSN:
      process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN,

    // --- Turnstile ---
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },

  emptyStringAsUndefined: true,
});
