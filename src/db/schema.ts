import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

/**
 * Application database schema.
 *
 * Uses a custom schema `app` to separate application tables from
 * Supabase's `auth.*` and `storage.*` schemas. RLS policies reference
 * `auth.uid()` (via the `authUid` SQL fragment from `drizzle-orm/supabase`)
 * for ownership checks.
 *
 * Single source of truth: tables, indexes, RLS policies, and FKs are all
 * declared here and produced by `drizzle-kit generate`. Triggers, the storage
 * bucket, and privilege revokes live in the custom migration
 * `<ts>_supabase_triggers_and_storage.sql` (the documented Drizzle escape
 * hatch for SQL Drizzle can't express declaratively).
 *
 * Generic SaaS shape: profiles (extends Supabase auth), subscriptions
 * (billing gate), organizations (user-owned workspaces), webhook_events
 * (idempotency). Adapt the columns to your domain.
 */

export const app = pgSchema("app");

/* -----------------------------------------------------------
 * Enums
 *
 * Declared on the `app` schema (app.enum) rather than top-level pgEnum so
 * they land in `app` (CREATE TYPE "app"."...") — matching the tables that
 * reference them. Supabase's default search_path is `public`, so an unqualified
 * reference to an enum in `public` from a table in `app` would fail.
 * --------------------------------------------------------- */

/** Resource visibility — simple public/private gate. Extend for your domain. */
export const visibilityEnum = app.enum("visibility", ["public", "private"]);

/** Subscription status — mirrors Razorpay/Stripe lifecycle. */
export const subscriptionStatusEnum = app.enum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

/**
 * Webhook provider — which gateway dispatched this event. Named generically
 * (not `payment_provider`) because non-payment services (e.g. Resend) reuse
 * the `webhook_events` idempotency ledger.
 */
export const webhookProviderEnum = app.enum("webhook_provider", [
  "razorpay",
  "stripe",
  "resend",
]);

/** Delivery channel for a notification. in_app is always created; email optional. */
export const notificationChannelEnum = app.enum("notification_channel", [
  "in_app",
  "email",
]);

/** Severity / styling hint. UI maps these to colors and icons. */
export const notificationLevelEnum = app.enum("notification_level", [
  "info",
  "success",
  "warning",
  "error",
]);

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** SQL fragment reused by every "self only" policy: `(select auth.uid())`. */
const selfOwns = () => sql`${authUid} = id`;
const selfOwnsColumn = (col: { name: string }) =>
  sql`${authUid} = ${sql.identifier(col.name)}`;

/* -----------------------------------------------------------
 * Profiles — extends Supabase auth.users
 * --------------------------------------------------------- */

export const profiles = app.table(
  "profiles",
  {
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
  },
  (t) => [
    // profiles.id is the same UUID as auth.users.id — real FK so CASCADE works.
    foreignKey({
      columns: [t.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_fk",
    }).onDelete("cascade"),

    pgPolicy("profiles_select_self", {
      for: "select",
      to: authenticatedRole,
      using: selfOwns(),
    }),
    pgPolicy("profiles_insert_self", {
      for: "insert",
      to: authenticatedRole,
      withCheck: selfOwns(),
    }),
    pgPolicy("profiles_update_self", {
      for: "update",
      to: authenticatedRole,
      using: selfOwns(),
      withCheck: selfOwns(),
    }),
  ],
);

/* -----------------------------------------------------------
 * Subscriptions — the subscription gate.
 * Server-authoritative. Never trust the client for plan/status.
 * --------------------------------------------------------- */

export const subscriptions = app.table(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    plan: varchar("plan", { length: 50 }).notNull(), // 'starter' | 'pro' (see lib/payments/plans.ts)
    status: subscriptionStatusEnum("status").notNull().default("trialing"),

    provider: webhookProviderEnum("provider").notNull(),
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
  },
  (t) => [
    check("subscriptions_amount_cents_check", sql`${t.amountCents} >= 0`),
    index("idx_subscriptions_user_id").on(t.userId),
    index("idx_subscriptions_provider_sub").on(t.providerSubscriptionId),
    index("idx_subscriptions_status").on(t.status),

    // Owner can READ their own. No client writes — service_role bypasses RLS,
    // which is how webhook handlers (admin client) write.
    pgPolicy("subs_select_self", {
      for: "select",
      to: authenticatedRole,
      using: selfOwnsColumn(t.userId),
    }),
  ],
);

/* -----------------------------------------------------------
 * Organizations — user-owned workspaces (rename to "teams", "projects",
 * "stores", etc. for your domain). Generic shape kept intentionally minimal.
 * --------------------------------------------------------- */

export const organizations = app.table(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
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
  },
  (t) => [
    unique("organizations_slug_unique").on(t.slug),
    index("idx_organizations_owner_id").on(t.ownerId),
    index("idx_organizations_visibility").on(t.visibility),

    // Owner: full CRUD on their own rows.
    pgPolicy("orgs_select_owner", {
      for: "select",
      to: authenticatedRole,
      using: selfOwnsColumn(t.ownerId),
    }),
    // Readers: SELECT governed by the visibility column.
    //   public:  visible to all authenticated users
    //   private: visible to the owner only (covered above)
    pgPolicy("orgs_select_visibility", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.visibility} = 'public'`,
    }),
    pgPolicy("orgs_insert_owner", {
      for: "insert",
      to: authenticatedRole,
      withCheck: selfOwnsColumn(t.ownerId),
    }),
    pgPolicy("orgs_update_owner", {
      for: "update",
      to: authenticatedRole,
      using: selfOwnsColumn(t.ownerId),
      withCheck: selfOwnsColumn(t.ownerId),
    }),
    pgPolicy("orgs_delete_owner", {
      for: "delete",
      to: authenticatedRole,
      using: selfOwnsColumn(t.ownerId),
    }),
  ],
);

/* -----------------------------------------------------------
 * Webhook events — idempotency ledger.
 * Every webhook handler records the event ID before processing.
 * Duplicate deliveries are detected and skipped.
 * Service-role only: NO policy for authenticated = no client access.
 * --------------------------------------------------------- */

export const webhookEvents = app.table(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: webhookProviderEnum("provider").notNull(),
    eventId: varchar("event_id", { length: 200 }).notNull(),
    eventType: varchar("event_type", { length: 100 }),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    payload: jsonb("payload").$type<JsonValue>(),
  },
  (t) => [
    // Enforce idempotency: one row per (provider, event_id).
    unique("uniq_webhook_provider_event").on(t.provider, t.eventId),
  ],
);

/* -----------------------------------------------------------
 * Audit logs — append-only record of security-sensitive actions.
 *
 * Written by the service role (webhooks, server actions, route handlers) via
 * the admin Drizzle client — clients have NO insert/update/delete policy, so
 * the SDK cannot tamper with the log. Users can SELECT only their own rows
 * (where actor_id matches their auth.uid).
 *
 * actor_id is nullable so system/webhook-originated events can be recorded;
 * on user deletion the FK sets NULL (rather than cascade) so the audit trail
 * survives — a regulatory expectation for auth/billing/destructive actions.
 * --------------------------------------------------------- */

export const auditLogs = app.table(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Nullable: system/webhook actions have no human actor.
    actorId: uuid("actor_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: varchar("resource_id", { length: 100 }),
    // Nullable: not every action is tenant-scoped.
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    requestId: varchar("request_id", { length: 100 }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    // Sanitized before insert — secrets/passwords/tokens are stripped by
    // the logAudit helper. Treat as untrusted anyway.
    metadata: jsonb("metadata").$type<JsonValue>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_audit_actor_id").on(t.actorId),
    index("idx_audit_resource").on(t.resourceType, t.resourceId),
    index("idx_audit_organization_id").on(t.organizationId),
    index("idx_audit_created_at").on(t.createdAt),

    // Append-only: clients can SELECT their own rows, nothing else.
    // The service role (admin client) bypasses RLS for inserts.
    pgPolicy("audit_select_self", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = actor_id`,
    }),
  ],
);

/* -----------------------------------------------------------
 * Notifications — provider-neutral in-app + email layer.
 *
 * Each notification row is always in_app; an email may also be sent by the
 * dispatcher (lib/notifications/dispatch.ts), in which case email_message_id
 * is filled in for bounce/complaint reconciliation via the Resend webhook.
 * Clients can SELECT their own + UPDATE only read_at (mark-as-read).
 * Inserts are service-role only — notifications are system-generated.
 * --------------------------------------------------------- */

export const notifications = app.table(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    level: notificationLevelEnum("level").notNull().default("info"),
    // Free-form category — the dispatcher's preference gate matches on this.
    category: varchar("category", { length: 50 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body"),
    url: text("url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    // Set after Resend accepts the email — used by webhook handlers to
    // reconcile bounce/complaint events back to a notification row.
    emailMessageId: varchar("email_message_id", { length: 200 }),
    metadata: jsonb("metadata").$type<JsonValue>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("idx_notifications_user_created").on(t.userId, t.createdAt),
    index("idx_notifications_user_unread")
      .on(t.userId, t.readAt)
      .where(sql`${t.readAt} is null`),
    index("idx_notifications_email_message_id")
      .on(t.emailMessageId)
      .where(sql`${t.emailMessageId} is not null`),

    pgPolicy("notifications_select_self", {
      for: "select",
      to: authenticatedRole,
      using: selfOwnsColumn(t.userId),
    }),
    // Clients can only flip read_at — title/body/etc are server-owned.
    pgPolicy("notifications_update_self", {
      for: "update",
      to: authenticatedRole,
      using: selfOwnsColumn(t.userId),
      withCheck: selfOwnsColumn(t.userId),
    }),
  ],
);

/* -----------------------------------------------------------
 * Notification preferences — per-user opt-outs and suppression state.
 *
 * `emailCategories` is a jsonb array of category strings the user still wants
 * email for. The dispatcher removes a category when the user unsubscribes;
 * unsubscribedAt/bouncedAt/complainedAt are set by the unsubscribe endpoint
 * and the Resend webhook respectively to globally suppress email.
 * --------------------------------------------------------- */

export const NOTIFICATION_CATEGORIES = [
  "billing",
  "security",
  "system",
  "invite",
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const notificationPreferences = app.table(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    emailCategories: jsonb("email_categories")
      .$type<NotificationCategory[]>()
      .notNull()
      .default([...NOTIFICATION_CATEGORIES]),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    bouncedAt: timestamp("bounced_at", { withTimezone: true }),
    complainedAt: timestamp("complained_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    pgPolicy("notification_preferences_all_self", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.userId} = ${authUid}`,
      withCheck: sql`${t.userId} = ${authUid}`,
    }),
  ],
);

/* -----------------------------------------------------------
 * Relations
 * --------------------------------------------------------- */

export const profilesRelations = relations(profiles, ({ many }) => ({
  subscriptions: many(subscriptions),
  organizations: many(organizations),
  notifications: many(notifications),
  notificationPreferences: many(notificationPreferences),
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

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(profiles, {
      fields: [notificationPreferences.userId],
      references: [profiles.id],
    }),
  }),
);

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
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference =
  typeof notificationPreferences.$inferInsert;
export type Visibility = (typeof visibilityEnum.enumValues)[number];
export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];
export type WebhookProvider = (typeof webhookProviderEnum.enumValues)[number];
export type NotificationChannel =
  (typeof notificationChannelEnum.enumValues)[number];
export type NotificationLevel =
  (typeof notificationLevelEnum.enumValues)[number];
