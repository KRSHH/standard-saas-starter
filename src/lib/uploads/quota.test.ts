import { describe, expect, it } from "vitest";

import { UPLOAD_LIMITS, validateUpload } from "@/lib/uploads/quota";

describe("UPLOAD_LIMITS", () => {
  it("has sensible defaults", () => {
    expect(UPLOAD_LIMITS.maxFileSizeBytes).toBeGreaterThan(0);
    expect(UPLOAD_LIMITS.perUserQuotaBytes).toBeGreaterThan(
      UPLOAD_LIMITS.maxFileSizeBytes,
    );
    expect(UPLOAD_LIMITS.allowedMimeTypes.length).toBeGreaterThan(0);
  });
});

describe("validateUpload", () => {
  it("accepts an allowed MIME type within size limits", () => {
    expect(
      validateUpload({ contentType: "image/png", size: 1024, kind: "avatars" }),
    ).toEqual({ ok: true });
    expect(
      validateUpload({
        contentType: "image/jpeg",
        size: UPLOAD_LIMITS.maxFileSizeBytes,
        kind: "avatars",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects disallowed MIME types", () => {
    const r = validateUpload({
      contentType: "application/pdf",
      size: 1024,
      kind: "attachments",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unsupported file type/i);
  });

  it("rejects files over the max size", () => {
    const r = validateUpload({
      contentType: "image/png",
      size: UPLOAD_LIMITS.maxFileSizeBytes + 1,
      kind: "avatars",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too large/i);
  });

  it("rejects empty files", () => {
    const r = validateUpload({
      contentType: "image/png",
      size: 0,
      kind: "avatars",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);

    const r2 = validateUpload({
      contentType: "image/png",
      size: -1,
      kind: "avatars",
    });
    expect(r2.ok).toBe(false);
  });
});
