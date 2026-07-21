"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit/log";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";

/**
 * Server Actions for the account lifecycle.
 *
 * - Used by the Settings page and email-verification banner.
 * - Destructive operations (account deletion) require the service-role admin
 *   client because the user's own session can't delete their auth.users row.
 * - Each action records an audit entry before mutating.
 */

export type AuthActionResult = { ok: true } | { ok: false; error: string };

/**
 * Persist a storage path as the current user's avatar. The caller must have
 * already uploaded the object (via /api/uploads + the signed URL) — we only
 * record the path on the profile row. Ownership is re-verified server-side:
 * the path's first segment must equal the user's id.
 */
export async function setAvatarPath(
  storagePath: string,
): Promise<AuthActionResult> {
  const user = await getCurrentUser();
  const ownerSegment = storagePath.split("/")[0];
  if (!ownerSegment || ownerSegment !== user.id) {
    return { ok: false, error: "Not your file." };
  }
  if (!storagePath.startsWith(`${user.id}/avatars/`)) {
    return { ok: false, error: "File is not in the avatars namespace." };
  }

  await db
    .update(profiles)
    .set({ avatarUrl: storagePath, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));

  await logAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.USER_PROFILE_UPDATED,
    resourceType: AUDIT_RESOURCES.USER,
    resourceId: user.id,
    metadata: { field: "avatar_url" },
  });

  revalidatePath("/app/settings");
  return { ok: true };
}

/**
 * Update the current user's profile row (display name). Customer ids and
 * avatar are managed elsewhere (webhooks / uploads slice).
 */
export async function updateProfile(
  fullName: string,
): Promise<AuthActionResult> {
  const user = await getCurrentUser();
  const trimmed = fullName.trim();
  if (trimmed.length < 1 || trimmed.length > 200) {
    return { ok: false, error: "Name must be 1–200 characters." };
  }

  await db
    .update(profiles)
    .set({ fullName: trimmed, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));

  await logAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.USER_PROFILE_UPDATED,
    resourceType: AUDIT_RESOURCES.USER,
    resourceId: user.id,
    metadata: { field: "full_name" },
  });

  revalidatePath("/app/settings");
  return { ok: true };
}

/** Resend the email-verification link for the current user. */
export async function resendVerificationEmail(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "No user session." };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Permanently delete the current user's account. Requires a freshly-issued
 * reauthentication nonce (verified by Supabase on the client before this
 * action is invoked). The cascade on profiles/subscriptions/organizations
 * cleans up app data; audit_logs.actor_id is set null so the audit trail
 * survives deletion.
 */
export async function deleteAccount(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No user session." };

  // Audit BEFORE the user is gone — we can't attribute the row afterwards.
  await logAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.USER_ACCOUNT_DELETED,
    resourceType: AUDIT_RESOURCES.USER,
    resourceId: user.id,
    metadata: { email: user.email },
  });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: error.message };

  // Clear cookies locally too (defensive — admin delete invalidates the JWT,
  // but explicit signout gives the browser a clean state).
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Unlink an OAuth identity from the current user. Refused if the user has
 * fewer than 2 identities AND no password set — otherwise they'd lock
 * themselves out of their only login method.
 */
export async function unlinkOAuthIdentity(
  identityId: string,
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No user session." };

  const { data: identitiesData, error: identitiesError } =
    await supabase.auth.getUserIdentities();
  if (identitiesError) return { ok: false, error: identitiesError.message };

  const identities = identitiesData?.identities ?? [];
  const target = identities.find((i) => i.id === identityId);
  if (!target) return { ok: false, error: "Identity not found." };

  const hasPassword = identities.some((i) => i.provider === "email");
  if (identities.length < 2 && !hasPassword) {
    return {
      ok: false,
      error:
        "Add another sign-in method before removing the last one, or you'll lose access.",
    };
  }

  // unlinkIdentity takes a full UserIdentity — pass the one we resolved above.
  const { error: unlinkError } = await supabase.auth.unlinkIdentity(target);
  if (unlinkError) return { ok: false, error: unlinkError.message };

  await logAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.USER_OAUTH_UNLINKED,
    resourceType: AUDIT_RESOURCES.USER,
    resourceId: user.id,
    metadata: { provider: target.provider, identityId: target.id },
  });

  revalidatePath("/app/settings");
  return { ok: true };
}
