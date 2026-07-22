# 06 — Email & Notifications

Two related systems: **email** (transactional, via Resend) and
**notifications** (in-app + email, provider-neutral). Both are best-effort by
design — a failure never breaks the user's request.

> Verified: `resend.webhooks.verify({ payload, headers, webhookSecret })`
> matches the Resend webhook docs.

---

## Email (Resend)

### Client

`src/lib/email/client.ts` — lazily initialized. `getResend()` throws only when
called without `RESEND_API_KEY`, so the app runs without email configured.

| Helper         | Purpose                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| `emailFrom`    | Sender address (`EMAIL_FROM`, defaults to Resend sandbox).                    |
| `emailReplyTo` | Reply-To (`EMAIL_REPLY_TO`).                                                  |
| `appDomain`    | Your domain (derived from `siteConfig.url`) — for Resend domain verification. |

### Templates

`src/emails/` — react-email components. Built-in:

- `welcome.tsx` — sent on signup (`sendWelcomeEmail`).
- `notification.tsx` — sent by the notification dispatcher.

Each uses react-email's `<Tailwind>` wrapper (no `tailwind.config` needed for
email — it has its own Tailwind config).

### Previewing email locally

```bash
bun run email:dev
```

Opens react-email dev server on `http://localhost:3001` to render templates
with mock props.

### Sending email

`src/lib/email/send.ts` is the entry point for transactional email. The
notification dispatcher (`src/lib/notifications/dispatch.ts`) calls Resend
directly. Always wrap in try/catch — email is best-effort.

### Verified sender

`EMAIL_FROM` must be on a **verified domain** in Resend (Dashboard → Domains).
For dev, use the sandbox: `Acme <onboarding@resend.dev>`.

---

## Notifications (in-app + email)

A provider-neutral layer. Every notification is always **in-app**; an email is
sent optionally, based on the user's preferences.

### Tables

- `app.notifications` — the notification rows. Level, category, title, body,
  URL, read state, and an `email_message_id` for webhook reconciliation.
- `app.notification_preferences` — per-user opt-outs and suppression state.

### Categories

Defined in `src/db/schema.ts`:

```ts
export const NOTIFICATION_CATEGORIES = [
  "billing",
  "security",
  "system",
  "invite",
] as const;
```

Add your own categories here, then use them when dispatching.

### Dispatching

`src/lib/notifications/dispatch.ts`:

```ts
await dispatchNotification({
  userId,
  category: "billing",
  level: "info", // info | success | warning | error
  title: "Payment received",
  body: "Your Pro plan is active.",
  url: "/app/billing",
  sendEmail: true, // default true; pass false to force in-app only
});
```

The dispatcher:

1. **Always** inserts an in-app row.
2. Checks `emailAllowed(input)` — see below.
3. If allowed, renders + sends via Resend. On failure, logs + audits but never
   throws (the in-app row still exists).

### Email preferences gate

`emailAllowed()` checks the user's preference row:

- `emailEnabled` must be true.
- No global suppression (`unsubscribedAt`, `bouncedAt`, `complainedAt`).
- The notification's category must be in `emailCategories`.

If any fail, only the in-app row is created.

### API routes

| Route                            | Method    | Purpose                                 |
| -------------------------------- | --------- | --------------------------------------- |
| `/api/notifications`             | GET       | List current user's notifications.      |
| `/api/notifications/[id]/read`   | POST      | Mark one as read.                       |
| `/api/notifications/read-all`    | POST      | Mark all as read.                       |
| `/api/notifications/preferences` | GET/PATCH | Get/update email preferences.           |
| `/api/notifications/unsubscribe` | GET       | One-click unsubscribe (token in query). |

### The bell UI

`src/components/dashboard/notification-bell.tsx` — polls `/api/notifications`,
shows unread count, dropdown list. Uses React Query (defined in the
component).

---

## Unsubscribe flow

Stateless, HMAC-signed tokens — no DB lookup needed to validate a click from
an email. See `src/lib/notifications/tokens.ts`.

### Format

`<base64url-payload>.<base64url-signature>`

Payload encodes `{ userId, category?, exp }` (exp = 1 year — unsubscribe links
should be durable). Signed with HMAC-SHA256.

### Secret

```ts
const secret = process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET;
if (secret) return secret;
if (process.env.NODE_ENV === "production") {
  throw new Error("NOTIFICATIONS_UNSUBSCRIBE_SECRET is required in production");
}
return `dev-unsubscribe-${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "insecure"}`;
```

- **Dev:** derived from the service-role key (zero-config).
- **Prod:** **required** — `getSecret()` throws rather than falling back to a
  guessable secret. This mirrors the rate-limiter's fail-closed posture: an
  unset secret would let anyone forge unsubscribe tokens for arbitrary users.
  Set `NOTIFICATIONS_UNSUBSCRIBE_SECRET` to a long random string.

> Rotating the secret invalidates all existing unsubscribe tokens. That's
> usually fine (they expire in a year anyway), but be aware.

### Two scopes

- **Category unsubscribe:** token carries `category` → removes that category
  from `emailCategories`. Other categories still email.
- **Global unsubscribe:** no category → sets `unsubscribedAt`. All email stops.

Every dispatched email includes an unsubscribe URL built from the token:

```
${siteConfig.url}/api/notifications/unsubscribe?token=...
```

---

## The Resend webhook (bounce/complaint handling)

`src/app/api/webhooks/resend/route.ts` handles delivery, bounce, and complaint
events. The flow mirrors the payment webhooks: raw body → signature verify →
idempotency claim → handle.

### Handled events

| Event                                             | Action                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `email.bounced`                                   | Sets `notification_preferences.bouncedAt` on the matching user. Audits. |
| `email.complained`                                | Sets `complainedAt`. Audits.                                            |
| `email.delivered` / `opened` / `sent` / `clicked` | No state change (left to PostHog/Resend).                               |

### Reconciliation

Each email notification row stores the Resend `email_message_id` (set after
the send succeeds, via `setEmailMessageId`). The index
`idx_notifications_email_message_id` lets you join webhook events back to
notification rows.

### Why bounce/complaint matters

Once `bouncedAt` or `complainedAt` is set, `emailAllowed()` returns false for
**all** future emails. This protects your sender reputation — you never email
someone who bounced or complained. Clear the timestamp manually (in the admin
dashboard) if a user asks to be re-added.

---

## Configuration summary

| What                               | Where               | Required?                                                                                           |
| ---------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`                   | `.env.local`        | To send any email.                                                                                  |
| `EMAIL_FROM`                       | `.env.local`        | Sender address (verified domain).                                                                   |
| `EMAIL_REPLY_TO`                   | `.env.local`        | Reply-To.                                                                                           |
| `RESEND_WEBHOOK_SECRET`            | `.env.local`        | To process bounce/complaint events.                                                                 |
| `NOTIFICATIONS_UNSUBSCRIBE_SECRET` | `.env.local` (prod) | Stateless unsubscribe token signing. **Required in prod** (the app throws on first use if missing). |
| Resend webhook endpoint            | Resend dashboard    | `/api/webhooks/resend`.                                                                             |
| Verified domain                    | Resend dashboard    | For `EMAIL_FROM` (or use sandbox for dev).                                                          |

---

## Common tasks

### Add a notification template

1. Create `src/emails/my-template.tsx` (react-email component).
2. Call `dispatchNotification(...)` from your server action/route, or call
   Resend directly for a one-off email.
3. Pick or add a category in `NOTIFICATION_CATEGORIES`.

### Add a new category

1. Add it to `NOTIFICATION_CATEGORIES` in `src/db/schema.ts`.
2. `bun run db:generate` + `bun run db:migrate` (if you're defaulting it in
   preferences).
3. Use it in `dispatchNotification({ category: "..." })`.

### Send a transactional email (not a notification)

```ts
import { getResend, emailFrom } from "@/lib/email/client";

await getResend().emails.send({
  from: emailFrom,
  to: user.email,
  subject: "...",
  react: MyTemplate({ ... }),
});
```
