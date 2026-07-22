# 03 — Database & Schema

Postgres (on Supabase) + Drizzle ORM. The schema is the single source of truth:
tables, indexes, foreign keys, and Row-Level Security (RLS) policies are all
declared in TypeScript and produced by `drizzle-kit generate`.

> Verified patterns: `pgPolicy`, `authenticatedRole`, `authUid`, `authUsers`
> from `drizzle-orm/supabase` match the Drizzle RLS reference docs.

---

## Connection strings

Two Supabase connection modes:

| Mode                   | Port | Use for                                     | Why                                               |
| ---------------------- | ---- | ------------------------------------------- | ------------------------------------------------- |
| **Direct**             | 5432 | Migrations, local dev, long-running servers | One persistent connection.                        |
| **Pooler (pgBouncer)** | 6543 | Serverless (Vercel functions)               | Connection pooling for many short-lived requests. |

Set `DATABASE_URL` accordingly. The Drizzle client (`src/db/index.ts`) is
already pooler-friendly:

```ts
const client = postgres(queryString, { prepare: false, max: 1 });
```

`prepare: false` is required under pgBouncer. `max: 1` is correct for
serverless functions (each function invocation gets one connection).

> **Switching to the edge runtime?** `postgres-js` needs TCP, which the Edge
> runtime doesn't support. Use `@neondatabase/serverless` (HTTP driver)
> instead — see the comment in `src/db/index.ts`.

---

## The three Supabase clients

The template uses three different clients depending on context. Understanding
which is which is the key to the whole security model.

| Client           | File                         | Role                         | RLS      | Where used                                                         |
| ---------------- | ---------------------------- | ---------------------------- | -------- | ------------------------------------------------------------------ |
| **Server**       | `src/lib/supabase/server.ts` | `authenticated` (user's JWT) | Enforced | Server Components, Route Handlers, Server Actions, middleware.     |
| **Browser**      | `src/lib/supabase/client.ts` | `authenticated` (user's JWT) | Enforced | Client Components.                                                 |
| **Admin**        | `src/lib/supabase/admin.ts`  | `service_role`               | Bypassed | Webhooks, system actions, audit logging. Server-only.              |
| **Drizzle `db`** | `src/db/index.ts`            | `postgres`                   | Bypassed | Server-authoritative writes (subscriptions, notifications, audit). |

The server and browser clients use the **anon key** and respect RLS — users
can only touch their own rows. The admin client uses the **service-role key**
and bypasses RLS — used for system operations (account deletion, webhook
writes). The Drizzle client connects as the `postgres` role (also RLS-bypass)
and is used for server-authoritative writes.

> **Why two RLS-bypassing writers?** The admin Supabase client is the idiomatic
> Supabase way. The Drizzle client gives you type-safe query building and
> relations. They coexist: use whichever fits the call site. The RLS policies
> in the schema protect against the anon/authenticated clients — they don't
> need to protect against the server.

---

## The `app` schema

Everything lives in a custom Postgres schema called `app` (declared via
`pgSchema("app")` in `src/db/schema.ts`), keeping app tables separate from
Supabase's `auth.*` and `storage.*` schemas.

### Enums

```ts
visibilityEnum; // public | private
subscriptionStatusEnum; // trialing | active | past_due | canceled | paused
webhookProviderEnum; // razorpay | stripe | resend
notificationChannelEnum; // in_app | email
notificationLevelEnum; // info | success | warning | error
```

Enums are declared on the schema (`app.enum(...)`, not top-level `pgEnum`) so
they land in `app` — matching the tables that reference them.

### Tables

| Table                      | Purpose                                                                            | RLS                                      |
| -------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `profiles`                 | Extends `auth.users` (id FK + CASCADE). Email, name, avatar, gateway customer ids. | Self: select/insert/update.              |
| `subscriptions`            | The billing gate. Server-authoritative — never trust the client for plan/status.   | Self: select only.                       |
| `organizations`            | User-owned workspaces. Generic shape — rename for your domain.                     | Owner: full CRUD. Others: select public. |
| `webhook_events`           | Idempotency ledger. Unique on (provider, event_id).                                | None (service-role only).                |
| `audit_logs`               | Append-only security-sensitive action log.                                         | Self: select only.                       |
| `notifications`            | In-app + email notification rows.                                                  | Self: select + update read_at only.      |
| `notification_preferences` | Per-user opt-outs, bounce/complaint state.                                         | Self: all.                               |

### RLS pattern

Policies use the Supabase `auth.uid()` helper, exposed by Drizzle as `authUid`:

```ts
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

// "self only" SQL fragment: (select auth.uid()) = id
const selfOwns = () => sql`${authUid} = id`;

pgPolicy("profiles_select_self", {
  for: "select",
  to: authenticatedRole,
  using: selfOwns(),
}),
```

Tables with **no policy for a given operation** are unaccessible to the anon/
authenticated clients for that operation. This is how `webhook_events`,
`audit_logs` inserts, and `notifications` inserts stay service-role-only —
clients simply have no policy granting them access.

### Foreign keys to `auth.users`

```ts
foreignKey({
  columns: [t.id],
  foreignColumns: [authUsers.id],
  name: "profiles_id_fk",
}).onDelete("cascade"),
```

`profiles.id` is the same UUID as `auth.users.id`. The real FK means CASCADE
works: deleting a user in Supabase Auth cascades to their profile,
subscriptions, organizations, and notifications. `audit_logs.actor_id` is set
NULL on delete (not cascade) so the audit trail survives — a regulatory
expectation.

### Relations

Drizzle relations are declared for the query API (`db.query.profiles.findMany({
with: { subscriptions: true } })`). See `profilesRelations`,
`subscriptionsRelations`, etc. in the schema file.

---

## Migrations

Migrations are generated SQL files in `drizzle/`. Two kinds:

### Generated migrations (`drizzle-kit generate`)

Produced from the TypeScript schema. Filenames are Supabase-compatible
(`YYYYMMDDHHMMSS_name.sql`) via the `migrations.prefix: "supabase"` config in
`drizzle.config.ts`.

### Custom migrations (`drizzle-kit generate --custom`)

For SQL Drizzle can't express declaratively — triggers, storage buckets,
privilege revokes. This is the documented Drizzle escape hatch. The template
ships one: `20260721110706_supabase_triggers_and_storage.sql` (creates the
`new_user` trigger that inserts a profile row on signup, the `uploads` storage
bucket, and revokes public privileges).

### Commands

```bash
bun run db:generate  # Generate a migration from schema changes
bun run db:custom    # Empty custom migration (for raw SQL)
bun run db:push      # Push schema directly to DB (DEV ONLY — no migration file)
bun run db:migrate   # Apply pending migrations
bun run db:studio    # Open Drizzle Studio (GUI)
```

> **`db:push` is dev-only.** It mutates the DB directly without generating a
> migration file, so it can drift from your schema history. Never use it in
> production. Use `db:migrate` with reviewed migration files.

### Workflow for a schema change

1. Edit `src/db/schema.ts`.
2. `bun run db:generate` — review the generated SQL in `drizzle/`.
3. Commit the migration file.
4. `bun run db:migrate` to apply locally.
5. In production, `bun run db:migrate` runs as part of deploy (or manually).

---

## Seed

`bun run db:seed` runs `src/db/seed.ts`, which creates:

- 2 profiles (Alice / Bob) with fixed UUIDs
- A `trialing` subscription for each (Starter / Pro)
- 1 organization (Acme Labs, public)

Idempotent — safe to re-run (uses `onConflictDoUpdate` / `onConflictDoNothing`).
Requires `DATABASE_URL` and that migrations are applied.

The seed profiles use fixed UUIDs that don't exist in `auth.users`, so you
can't sign in as them — they're for testing queries and the dashboard UI. To
test auth, sign up normally.

---

## Where each table is read/written

| Table                      | Read by                                             | Written by                                                          |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `profiles`                 | `lib/auth.ts` (`getCurrentProfile`), settings pages | Trigger (on signup), `lib/auth/actions.ts`, webhooks (customer ids) |
| `subscriptions`            | `lib/payments/subscriptions.ts`, billing page       | Webhooks (Stripe/Razorpay), `lib/payments/subscriptions.ts`         |
| `organizations`            | org page                                            | `lib/auth/actions.ts`                                               |
| `webhook_events`           | `lib/payments/webhook-idempotency.ts`               | Webhook handlers (idempotency claim)                                |
| `audit_logs`               | (admin only)                                        | `lib/audit/log.ts` (everywhere)                                     |
| `notifications`            | notification API + bell                             | `lib/notifications/store.ts` (dispatcher)                           |
| `notification_preferences` | dispatcher, preferences API                         | `lib/notifications/store.ts`, Resend webhook                        |

---

## Common tasks

### Add a column

1. Add it to the table definition in `src/db/schema.ts`.
2. `bun run db:generate`.
3. Review + commit the migration.
4. `bun run db:migrate`.

### Add a table with RLS

Copy the `profiles` or `notifications` pattern — define the table, add a
`pgPolicy` for each allowed operation, and decide whether clients can write at
all. If only the server writes, omit insert/update/delete policies entirely.

### Query with relations

```ts
import { db } from "@/db";

const profile = await db.query.profiles.findFirst({
  where: (profiles, { eq }) => eq(profiles.id, userId),
  with: { subscriptions: true },
});
```

### Raw SQL (escape hatch)

```ts
import { sql } from "drizzle-orm";
import { db } from "@/db";

const rows = await db.execute<{ count: number }>(sql`
  select count(*)::int as count from app.notifications
`);
```

Use sparingly — the query builder is preferred for type safety.
