# 04 — Authentication

Supabase Auth with cookie-based PKCE (via `@supabase/ssr`). The session lives
in cookies, shared between server and client — no `localStorage` token that
desyncs on refresh.

> Verified: `createServerClient` / `createBrowserClient` with `getAll`/`setAll`
> cookie methods match the `@supabase/ssr` API reference.

---

## The auth middleware

`src/proxy.ts` is the single Next.js middleware. On every request it:

1. Generates a per-request CSP nonce (→ security headers).
2. Refreshes the Supabase session (`getUser()` writes refreshed cookies).
3. Enforces the `/app` auth gate (redirects unauthenticated users to `/sign-in`).
4. Redirects authenticated users away from `/sign-in`, `/sign-up`, `/check-email`.

> **Important:** `getUser()` (not `getSession()`) is called server-side. It
> validates the JWT against Supabase's JWKS, so the session can't be forged by
> editing cookies. Use `getUser()` in your own server code too —
> `getSession()` reads the cookie without validation.

The matcher excludes static assets, Next internals, and webhooks (webhooks do
their own signature verification).

---

## Server-side access helpers

`src/lib/auth.ts`:

| Helper | Returns | Redirects? |
|--------|---------|------------|
| `getCurrentUser()` | The Supabase `User` | Yes — to `/sign-in` if missing. |
| `getCurrentUserOrNull()` | `User \| null` | No. |
| `getCurrentProfile()` | The user's `profiles` row or null | Yes (via `getCurrentUser`). |

Use `getCurrentUser()` at the top of any protected Server Component / Action.
For Route Handlers that need a 401 JSON response (not a redirect), use the
Supabase server client directly and check `getUser()`.

---

## Email + password

The default flow (see `src/components/auth/auth-form.tsx`):

1. **Sign up** → `supabase.auth.signUp()` with email, password, and
   `full_name` in `options.data`. Email confirmation is **on** by default.
2. User clicks the email link → lands at `/auth/callback` → session is set.
3. **Sign in** → `supabase.auth.signInWithPassword()`.
4. **Forgot password** → `supabase.auth.resetPasswordForEmail()` →
   `/reset-password`.
5. **Sign out** → `/auth/sign-out` route handler.

A Supabase trigger (`new_user`, in the custom migration) inserts a `profiles`
row on signup so the profile exists by the time the user lands in the app.

### Password change + reauthentication

Changing the password (or email, or deleting the account) is a sensitive
operation. Supabase returns `reauthentication_needed` if the session's AAL
(authenticator assurance level) is too low. The flow
(`src/components/settings/reauthenticate-dialog.tsx`):

1. Caller calls `supabase.auth.updateUser({ password })`.
2. On `reauthentication_needed`, open the dialog → `supabase.auth.reauthenticate()`
   emails a 6-digit OTP.
3. User enters the code → `verifyOtp({ type: "reauthentication", email, token })`
   bumps AAL.
4. The OTP code is passed back to the caller as a `nonce` to
   `updateUser({ ..., nonce })`.

---

## OAuth providers

`src/lib/auth/oauth-providers.ts` controls **which OAuth buttons render**:

```ts
export const OAUTH_PROVIDERS = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
] as const;
```

**Enablement is in the Supabase dashboard, not here.** This list only controls
the UI. To add a provider:

1. Enable it in Supabase Dashboard → **Authentication → Providers**.
2. Add it to `OAUTH_PROVIDERS` so the button renders.
3. Add its redirect URL in the provider's console:
   `https://<your-project>.supabase.co/auth/v1/callback`.

`signInWithOAuth({ provider, options: { redirectTo } })` is used for sign-in;
`linkIdentity()` for linking a second provider to an existing account.

### Unlinking

`unlinkOAuthIdentity()` (server action) refuses to remove the last sign-in
method — you'd lock yourself out. It requires either ≥2 identities or a
password set.

---

## Account lifecycle

Server actions in `src/lib/auth/actions.ts`:

| Action | What it does |
|--------|--------------|
| `setAvatarPath(path)` | Sets `profiles.avatar_url`. Re-verifies ownership (path must start with `${userId}/avatars/`). |
| `updateProfile(fullName)` | Sets `profiles.full_name`. Validates length 1–200. |
| `resendVerificationEmail()` | Resends the signup confirmation link. |
| `deleteAccount()` | Permanently deletes the user via the admin client. Cascades app data. Audit-logs first. |
| `unlinkOAuthIdentity(id)` | Removes an OAuth identity (see above). |

Every action records an audit entry **before** mutating. Destructive operations
require the service-role admin client (the user's session can't delete their
`auth.users` row).

---

## Callback + sign-out routes

| Route | Purpose |
|-------|---------|
| `/auth/callback` | Handles the email-confirmation / OAuth redirect. Sets the session, then routes to `/app`. |
| `/auth/sign-out` | Calls `signOut()`, clears cookies, redirects to `/`. |

---

## Configuration (Supabase dashboard)

These are **dashboard settings**, not env vars:

| Setting | Where | What |
|---------|------|------|
| Email confirmation | Auth → Settings | On by default. Keep it on. |
| Bot & Abuse Protection | Auth → Settings | Enable captcha if you use Turnstile. |
| Redirect URLs | Auth → URL Configuration | Add `http://localhost:3000/auth/callback` (dev) + your prod origin. |
| Providers | Auth → Providers | Enable Google/GitHub, add client id/secret from their consoles. |

---

## Common tasks

### Require auth in a Server Component

```tsx
import { getCurrentUser } from "@/lib/auth";

export default async function Page() {
  const user = await getCurrentUser(); // redirects if missing
  return <p>Hi {user.email}</p>;
}
```

### Require auth in a Route Handler (return 401, not redirect)

```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...
}
```

### Add a third OAuth provider

1. Enable it in Supabase.
2. Add `{ id: "apple", name: "Apple" }` to `OAUTH_PROVIDERS`.
3. Done — the button renders and the auth flow uses it automatically.
