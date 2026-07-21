import {
  pgEnum,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  integer,
  pgSchema,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Application database schema.
 *
 * Uses a custom schema `app` to separate application tables from
 * Supabase's `auth.*` and `storage.*` schemas. RLS policies reference
 * `auth.uid()` for ownership checks.
 *
 * Generic SaaS shape: profiles (extends Supabase auth), subscriptions
 * (billing gate), organizations (user-owned workspaces), webhook_events
 * (idempotency). Adapt the columns to your domain.
 */

export const app = pgSchema("app");

/* -----------------------------------------------------------
 * Enums
 * --------------------------------------------------------- */

/** Resource visibility — simple public/private gate. Extend for your domain. */
export const visibilityEnum = pgEnum("visibility", ["public", "private"]);

/** Subscription status — mirrors Razorpay/Stripe lifecycle. */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

/** Payment provider — which gateway processed this entity. */
export const providerEnum = pgEnum("payment_provider", ["razorpay", "stripe"]);

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/* -----------------------------------------------------------
 * Profiles — extends Supabase auth.users
 * --------------------------------------------------------- */

export const profiles = app.table("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: varchar("full_name", { length: 200 }),
  avatarUrl: text("avatar_url"),
  // Stripe-style customer id per provider (for subscription lookup)
  razorpayCustomerId: varchar("razorpay_customer_id", { length: 100 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* -----------------------------------------------------------
 * Subscriptions — the subscription gate.
 * Server-authoritative. Never trust the client for plan/status.
 * --------------------------------------------------------- */

export const subscriptions = app.table("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  plan: varchar("plan", { length: 50 }).notNull(), // 'starter' | 'pro' (see lib/payments/plans.ts)
  status: subscriptionStatusEnum("status").notNull().default("trialing"),

  provider: providerEnum("provider").notNull(),
  providerSubscriptionId: varchar("provider_subscription_id", {
    length: 100,
  }),
  providerPaymentId: varchar("provider_payment_id", { length: 100 }),

  // Amount in the smallest currency unit (cents for USD, paise for INR).
  // The template defaults to USD cents; switch to paise if you bill in INR.
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),

  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),

  // Raw webhook payload for audit / reconciliation
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* -----------------------------------------------------------
 * Organizations — user-owned workspaces (rename to "teams", "projects",
 * "stores", etc. for your domain). Generic shape kept intentionally minimal.
 * --------------------------------------------------------- */

export const organizations = app.table("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  website: text("website"),
  description: text("description"),
  tags: jsonb("tags").$type<string[]>(),

  // Simple visibility gate. Extend if you need role-tiered access.
  visibility: visibilityEnum("visibility").notNull().default("private"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* -----------------------------------------------------------
 * Webhook events — idempotency ledger.
 * Every webhook handler records the event ID before processing.
 * Duplicate deliveries are detected and skipped.
 * --------------------------------------------------------- */

export const webhookEvents = app.table("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: providerEnum("provider").notNull(),
  eventId: varchar("event_id", { length: 200 }).notNull(),
  eventType: varchar("event_type", { length: 100 }),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  payload: jsonb("payload").$type<JsonValue>(),
});

/* -----------------------------------------------------------
 * Relations
 * --------------------------------------------------------- */

export const profilesRelations = relations(profiles, ({ many }) => ({
  subscriptions: many(subscriptions),
  organizations: many(organizations),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(profiles, {
    fields: [subscriptions.userId],
    references: [profiles.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one }) => ({
  owner: one(profiles, {
    fields: [organizations.ownerId],
    references: [profiles.id],
  }),
}));

/* -----------------------------------------------------------
 * Type exports (used in server code + Zod schemas)
 * --------------------------------------------------------- */

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];
