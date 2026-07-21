import { describe, expect, it } from "vitest";

import {
  buildUploadPath,
  extractOwnerFromPath,
  slugifyFilename,
} from "@/lib/uploads/paths";

describe("slugifyFilename", () => {
  it("lowercases and replaces unsafe chars", () => {
    expect(slugifyFilename("Selfie.PNG")).toBe("selfie.png");
    expect(slugifyFilename("My File Name.jpeg")).toBe("my-file-name.jpeg");
    // Whitespace collapses to a single dash; underscores are preserved.
    expect(slugifyFilename("foo__bar  baz.gif")).toBe("foo__bar-baz.gif");
  });

  it("keeps only the basename from a path", () => {
    expect(slugifyFilename("C:\\users\\me\\avatar.png")).toBe("avatar.png");
    expect(slugifyFilename("../../etc/passwd")).toBe("passwd");
    expect(slugifyFilename("/tmp/foo/bar.jpeg")).toBe("bar.jpeg");
  });

  it("trims leading/trailing dots and dashes", () => {
    expect(slugifyFilename("---weird---")).toBe("weird");
    expect(slugifyFilename("...hidden...")).toBe("hidden");
  });

  it("truncates very long names", () => {
    const long = "a".repeat(200) + ".png";
    expect(slugifyFilename(long).length).toBeLessThanOrEqual(80);
  });

  it("falls back to 'file' for empty/unsafe input", () => {
    expect(slugifyFilename("")).toBe("file");
    expect(slugifyFilename("   ")).toBe("file");
    expect(slugifyFilename("!!!")).toBe("file");
  });
});

describe("buildUploadPath", () => {
  it("namespaces by user id and kind", () => {
    const path = buildUploadPath({
      userId: "uid-123",
      kind: "avatars",
      filename: "me.png",
      randomId: "abc",
    });
    expect(path).toBe("uid-123/avatars/abc-me.png");
  });

  it("supports the attachments kind", () => {
    const path = buildUploadPath({
      userId: "uid",
      kind: "attachments",
      filename: "doc.pdf",
      randomId: "xyz",
    });
    expect(path).toBe("uid/attachments/xyz-doc.pdf");
  });

  it("uses a random uuid when randomId is not supplied", () => {
    const path = buildUploadPath({
      userId: "uid",
      kind: "avatars",
      filename: "me.png",
    });
    expect(path).toMatch(/^uid\/avatars\/[0-9a-f-]+-me\.png$/);
  });

  it("slugifies the filename in the path", () => {
    const path = buildUploadPath({
      userId: "uid",
      kind: "avatars",
      filename: "Weird Name!!!.PNG",
      randomId: "r",
    });
    // The bangs collapse to a dash, then the dash-before-extension is trimmed.
    expect(path).toBe("uid/avatars/r-weird-name.png");
  });
});

describe("extractOwnerFromPath", () => {
  it("returns the first path segment", () => {
    expect(extractOwnerFromPath("uid/avatars/file.png")).toBe("uid");
    expect(extractOwnerFromPath("uid/attachments/sub/file.pdf")).toBe("uid");
  });

  it("returns null for malformed paths", () => {
    expect(extractOwnerFromPath("")).toBeNull();
    expect(extractOwnerFromPath("nopath")).toBeNull();
    expect(extractOwnerFromPath("/leading-slash.png")).toBeNull();
  });
});
