import type { UploadKind } from "@/lib/uploads/quota";

/**
 * Build per-user, per-kind storage paths. Each user's objects live under
 * `${userId}/<kind>/<random>-<slugified-filename>`, so:
 *   - The path's first segment is the owner id (used for ownership re-checks).
 *   - A random prefix prevents filename collisions between uploads of the
 *     same name and avoids leaking upload counts via sequential ids.
 *   - The slugified tail preserves a readable filename for downloads.
 *
 * `randomId` is injected so tests can pin the value; production uses
 * `crypto.randomUUID()`.
 */
export function buildUploadPath({
  userId,
  kind,
  filename,
  randomId = randomUuid(),
}: {
  userId: string;
  kind: UploadKind;
  filename: string;
  randomId?: string;
}): string {
  const safeName = slugifyFilename(filename);
  return `${userId}/${kind}/${randomId}-${safeName}`;
}

/**
 * Return the owner id encoded as the first path segment, or null if the path
 * is malformed. Used to re-check ownership before delete/download.
 */
export function extractOwnerFromPath(path: string): string | null {
  const firstSlash = path.indexOf("/");
  if (firstSlash <= 0) return null;
  return path.slice(0, firstSlash);
}

function randomUuid(): string {
  return globalThis.crypto.randomUUID();
}

/** Lowercase, strip path separators and unsafe chars, collapse whitespace. */
export function slugifyFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const slug = base
    .toLowerCase()
    // Replace runs of anything that isn't alphanum, dot, dash, underscore
    // with a single dash.
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    // Strip a stray dash sitting directly before a file extension, e.g.
    // "weird-name-.png" → "weird-name.png".
    .replace(/-(?=\.|$)/g, "")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return slug || "file";
}
