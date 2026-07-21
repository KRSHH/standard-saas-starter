import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import {
  UPLOAD_LIMITS,
  validateUpload,
  type UploadKind,
} from "@/lib/uploads/quota";
import { buildUploadPath, extractOwnerFromPath } from "@/lib/uploads/paths";

export const UPLOADS_BUCKET = "uploads";

/**
 * Issue a short-lived signed upload URL for a user's file. The caller resolves
 * the user (route handler returns 401 on missing session, server action
 * redirects) and passes it in — this function stays a pure helper.
 *
 * Flow:
 *   1. Validate MIME + size against UPLOAD_LIMITS (server-authoritative).
 *   2. Approximate quota check by summing existing object sizes from `list()`.
 *      Intentionally approximate (list paginates) — for strict accounting, add
 *      a `storage_usage` column and update it on upload/delete.
 *   3. Build a per-user path: `${userId}/${kind}/<uuid>-<slug>`.
 *   4. createSignedUploadUrl against the authenticated SSR client (RLS applies).
 *
 * The client then PUTs the file directly to Supabase Storage — bytes never
 * transit our Next.js server. After upload, the client persists the resulting
 * path where relevant (e.g. profiles.avatar_url).
 */
export async function createUploadUrl(input: {
  user: User;
  kind: UploadKind;
  contentType: string;
  size: number;
  filename: string;
}): Promise<
  | { ok: true; path: string; url: string; token: string }
  | { ok: false; status: number; error: string }
> {
  const { user, ...rest } = input;
  const supabase = await createClient();

  const validation = validateUpload(rest);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  const usage = await approximateUsage(supabase, user.id);
  if (usage + input.size > UPLOAD_LIMITS.perUserQuotaBytes) {
    return {
      ok: false,
      status: 413,
      error: `Storage quota exceeded (using ${usage} of ${UPLOAD_LIMITS.perUserQuotaBytes} bytes).`,
    };
  }

  const path = buildUploadPath({
    userId: user.id,
    kind: input.kind,
    filename: input.filename,
  });

  const { data, error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return {
      ok: false,
      status: 500,
      error: error?.message ?? "Failed to issue upload URL.",
    };
  }

  return {
    ok: true,
    path: data.path,
    url: data.signedUrl,
    token: data.token,
  };
}

/**
 * Issue a fresh signed download URL for a path owned by the current user.
 * Used by server components to render private avatars/attachments inline.
 * Ownership follows the same path-prefix rule as the public routes.
 */
export async function readSignedUrlForOwner(
  path: string,
  user: User,
): Promise<string | null> {
  const owner = extractOwnerFromPath(path);
  if (!owner || owner !== user.id) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

/**
 * Approximate total bytes used by a user in the uploads bucket.
 *
 * Storage paths are namespaced `${userId}/${kind}/...`. `list(prefix)` returns
 * one level deep, so we list the user's kind-subfolders and then the files in
 * each. Capped at the first 1000 objects per folder — for exact accounting,
 * maintain a `storage_usage` column and update it on upload/delete.
 */
async function approximateUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const kinds = await supabase.storage
    .from(UPLOADS_BUCKET)
    .list(userId, { limit: 100 });
  if (kinds.error || !kinds.data) return 0;

  let total = 0;
  for (const folder of kinds.data) {
    // Folders show up as entries with no size; files at the top level are
    // counted directly.
    if (typeof folder.metadata?.size === "number") {
      total += folder.metadata.size;
      continue;
    }
    const files = await supabase.storage
      .from(UPLOADS_BUCKET)
      .list(`${userId}/${folder.name}`, { limit: 1000 });
    if (files.error || !files.data) continue;
    for (const file of files.data) {
      const size = file.metadata?.size;
      if (typeof size === "number") total += size;
    }
  }
  return total;
}
