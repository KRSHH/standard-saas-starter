/**
 * Upload limits — the authoritative, server-enforced policy.
 *
 * The client also references these for UX (input accept, size hints) but
 * never trusts them as a security boundary; the server route re-validates
 * before issuing a signed URL.
 */
export const UPLOAD_LIMITS = {
  /** Max bytes per single file. 5 MB default. */
  maxFileSizeBytes: 5_000_000,
  /** Total bytes a single user may store across the `uploads` bucket. */
  perUserQuotaBytes: 100_000_000,
  /**
   * MIME types accepted by the uploader. Keep narrow — every accepted type
   * is also a potential attack surface if serving untrusted content.
   */
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ] as const,
} as const;

export type UploadKind = "avatars" | "attachments";

/**
 * Validate a prospective upload's metadata against the policy.
 * Returns a discriminated result — callers branch on `ok`.
 */
export function validateUpload(input: {
  contentType: string;
  size: number;
  kind: UploadKind;
}): { ok: true } | { ok: false; error: string } {
  if (!UPLOAD_LIMITS.allowedMimeTypes.includes(input.contentType as never)) {
    return {
      ok: false,
      error: `Unsupported file type: ${input.contentType}. Allowed: ${UPLOAD_LIMITS.allowedMimeTypes.join(", ")}`,
    };
  }
  if (input.size > UPLOAD_LIMITS.maxFileSizeBytes) {
    return {
      ok: false,
      error: `File is too large. Max ${UPLOAD_LIMITS.maxFileSizeBytes} bytes.`,
    };
  }
  if (input.size <= 0) {
    return { ok: false, error: "File is empty." };
  }
  return { ok: true };
}
