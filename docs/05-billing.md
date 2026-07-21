# 05 — Billing

Two payment gateways wired in: **Stripe** (global, default) and **Razorpay**
(popular in India). Both follow the same pattern: checkout creates a
subscription, webhooks update the server-authoritative `app.subscriptions`
table, and an idempotency ledger prevents double-processing.

> The subscription status is **never trusted from the client.** All gating
> reads from `app.subscriptions` via the server. See `isEntitled()` in
> `src/lib/payments/entitlement.ts`.

---

## Plans (single source of truth)

`src/lib/payments/plans.ts` defines the tiers. The template ships two —
**Starter** ($19/mo) and **Pro** ($49/mo) in USD:

```ts
export const PLANS = {
  starter: { priceUsd: 19, priceCents: 1900, currency: "usd", ... },
  pro:     { priceUsd: 49, priceCents: 4900, currency: "usd", ... },
} as const;

export const TRIAL_DAYS = 14;
```

**To change pricing:** edit `PLANS` (amounts, currency, feature copy). Gateway
plan/price ids are env vars (`STRIPE_STARTER_PRICE_ID`, etc.) so they don't
need code changes per environment.

**To bill in INR via Razorpay:** set `currency: "inr"` and amounts in **paise**
(₹1 = 100 paise).

---

## The subscription model

`app.subscriptions` is the server-authoritative record. Key columns:

| Column | Purpose |
|--------|---------|
| `userId` | Owning profile (FK + CASCADE). |
| `plan` | `'starter' \| 'pro'` (matches `PLANS` slugs). |
| `status` | `trialing \| active \| past_due \| canceled \| paused`. |
| `provider` | `razorpay \| stripe`. |
| `providerSubscriptionId` | The gateway's subscription id (lookup key for webhooks). |
| `providerPaymentId` | Latest payment id. |
| `amountCents` / `currency` | Smallest unit + ISO code. |
| `currentPeriodStart` / `currentPeriodEnd` | From the gateway. |
| `canceledAt` | When cancellation took effect. |
| `metadata` | Raw webhook payload for audit/reconciliation. |

### Entitlement gate

`isEntitled(sub)` returns true only for `trialing` or `active`. Everything else
(`past_due`, `canceled`, `paused`) is gated off. Use this to decide whether a
user can access paid features:

```ts
import { getActiveSubscription, isEntitled } from "@/lib/payments/subscriptions";

const sub = await getActiveSubscription(user.id);
if (!isEntitled(sub)) {
  // Show upgrade screen / restrict feature
}
```

---

## Stripe setup

### 1. Create products + prices

Stripe Dashboard → **Products** → add a product for each tier with a
**recurring** monthly price. Copy the `price_...` ids.

### 2. Set env vars

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

### 3. Register the webhook

Stripe Dashboard → **Developers → Webhooks → Add endpoint**:

- **Endpoint URL:** `https://<your-domain>/api/webhooks/stripe`
- **Events:** `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`.

Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

### Stripe v22 (acacia API) notes

The webhook handler (`src/app/api/webhooks/stripe/route.ts`) accounts for the
2025-09 API changes:

- `current_period_start/end` moved from `Subscription` to `SubscriptionItem`.
  The handler reads them from `sub.items.data[0]`.
- `invoice.subscription` was removed in favor of `invoice.parent`. The handler
  ignores invoices and relies on the three `customer.subscription.*` events,
  which cover every lifecycle transition.

---

## Razorpay setup

### 1. Create plans

Razorpay Dashboard → **Subscriptions → Plans** → create a plan for each tier.
Copy the `plan_...` ids.

### 2. Set env vars

```dotenv
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_STARTER_PLAN_ID=plan_...
RAZORPAY_PRO_PLAN_ID=plan_...
```

### 3. Register the webhook

Razorpay Dashboard → **Settings → Webhooks → New webhook**:

- **Webhook URL:** `https://<your-domain>/api/webhooks/razorpay`
- **Events:** `subscription.activated`, `subscription.charged`,
  `subscription.pending`, `subscription.halted`, `subscription.cancelled`.

Copy the secret → `RAZORPAY_WEBHOOK_SECRET`.

---

## Webhook idempotency

Every webhook handler calls `claimWebhookEvent(provider, eventId, meta)`
(`src/lib/payments/webhook-idempotency.ts`) before processing:

```ts
const isNew = await claimWebhookEvent("stripe", event.id, { ... });
if (!isNew) return NextResponse.json({ received: true, deduplicated: true });
```

The function inserts into `app.webhook_events` (unique on
`(provider, event_id)`). A `23505` Postgres unique-violation means duplicate →
return early. This prevents double-processing when a gateway retries.

### Signature verification (per provider)

| Provider | Method |
|----------|--------|
| Stripe | `stripe.webhooks.constructEventAsync(rawBody, signature, secret)` |
| Razorpay | HMAC-SHA256, timing-safe compared (`verifyRazorpayWebhook`) |
| Resend | `resend.webhooks.verify({ payload, headers, webhookSecret })` (Svix) |

All read the **raw body** (`await request.text()`) before any parsing — the
signature is over raw bytes.

---

## Status mapping

### Stripe → our enum

| Stripe event | Our status |
|--------------|------------|
| `customer.subscription.created` | `trialing` |
| `customer.subscription.updated` (active) | `active` |
| `customer.subscription.updated` (past_due/unpaid) | `past_due` |
| `customer.subscription.deleted` | `canceled` |

### Razorpay → our enum

| Razorpay event | Our status |
|----------------|------------|
| `subscription.activated` / `subscription.charged` | `active` |
| `subscription.pending` / `subscription.halted` | `past_due` |
| `subscription.cancelled` | `canceled` |

---

## Checkout flow (high level)

1. User picks a plan on `/pricing`.
2. Server creates a checkout session (Stripe Checkout / Razorpay subscription).
3. Gateway redirects back; the webhook fires asynchronously.
4. Webhook writes to `app.subscriptions`.
5. The app reads status from the DB — never from the client request.

> The template's checkout client code is minimal — it shows the intent.
> Implement your own success/cancel UI and idempotent subscription creation.

---

## Common tasks

### Add a third plan tier

1. Add it to `PLANS` in `src/lib/payments/plans.ts`.
2. Create the product/price in Stripe + Razorpay.
3. Add env vars (`STRIPE_<NAME>_PRICE_ID`, `RAZORPAY_<NAME>_PLAN_ID`).
4. Update the pricing page UI.

### Handle a new webhook event

1. Add it to the status map in the relevant webhook route.
2. If it's a new event type, register it in the gateway dashboard.

### Test webhooks locally

Use the gateway CLI / tunnel:

- **Stripe:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  (prints a `whsec_...` for local — set it as `STRIPE_WEBHOOK_SECRET`).
- **Razorpay:** use ngrok + the Razorpay test mode webhook.
- **Resend:** configure the webhook to your tunnel URL in the dashboard.

### Trial logic

`TRIAL_DAYS = 14`. The seed creates `trialing` subscriptions. To charge
immediately on signup instead, change the signup flow to create a checkout
session and seed `active` status from the first webhook.
