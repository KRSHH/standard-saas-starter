import { describe, expect, it } from "vitest";

import { OAUTH_PROVIDERS } from "@/lib/auth/oauth-providers";

describe("oauth providers registry", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(OAUTH_PROVIDERS)).toBe(true);
    expect(OAUTH_PROVIDERS.length).toBeGreaterThan(0);
  });

  it("each entry has an id and a name", () => {
    for (const p of OAUTH_PROVIDERS) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    const ids = OAUTH_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes google and github by default", () => {
    const ids = OAUTH_PROVIDERS.map((p) => p.id);
    expect(ids).toContain("google");
    expect(ids).toContain("github");
  });
});
