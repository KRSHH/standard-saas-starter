import { describe, expect, it } from "vitest";

import { isSensitiveKey, sanitizeMetadata } from "@/lib/audit/sanitize";

describe("audit sanitizer", () => {
  describe("isSensitiveKey", () => {
    it("flags password-like keys", () => {
      expect(isSensitiveKey("password")).toBe(true);
      expect(isSensitiveKey("currentPassword")).toBe(true);
      expect(isSensitiveKey("passwd")).toBe(true);
    });

    it("flags token/secret/api-key variants", () => {
      expect(isSensitiveKey("token")).toBe(true);
      expect(isSensitiveKey("accessToken")).toBe(true);
      expect(isSensitiveKey("refresh_token")).toBe(true);
      expect(isSensitiveKey("secret")).toBe(true);
      expect(isSensitiveKey("clientSecret")).toBe(true);
      expect(isSensitiveKey("api_key")).toBe(true);
      expect(isSensitiveKey("apiKey")).toBe(true);
      expect(isSensitiveKey("api-key")).toBe(true);
    });

    it("flags auth/cookie/session headers", () => {
      expect(isSensitiveKey("authorization")).toBe(true);
      expect(isSensitiveKey("Authorization")).toBe(true);
      expect(isSensitiveKey("cookie")).toBe(true);
      expect(isSensitiveKey("session")).toBe(true);
      expect(isSensitiveKey("sessionId")).toBe(true);
    });

    it("does not flag benign keys", () => {
      expect(isSensitiveKey("email")).toBe(false);
      expect(isSensitiveKey("userId")).toBe(false);
      expect(isSensitiveKey("plan")).toBe(false);
      expect(isSensitiveKey("from")).toBe(false);
      expect(isSensitiveKey("notes")).toBe(false);
    });

    it("is conservative — substring matches like 'tokens' are flagged", () => {
      // The regex has no word boundary; this over-redacts on purpose.
      // False positives are preferable to leaking a credential-shaped value.
      expect(isSensitiveKey("tokens")).toBe(true);
      expect(isSensitiveKey("userTokenCount")).toBe(true);
    });
  });

  describe("sanitizeMetadata", () => {
    it("redacts sensitive values at the top level", () => {
      const out = sanitizeMetadata({
        email: "a@b.com",
        password: "hunter2",
        plan: "pro",
      });
      expect(out).toEqual({
        email: "a@b.com",
        password: "[redacted]",
        plan: "pro",
      });
    });

    it("redacts sensitive values nested in objects and arrays", () => {
      const out = sanitizeMetadata({
        user: { id: "u1", token: "abc" },
        events: [
          { name: "login", session: "xyz" },
          { name: "logout", ok: true },
        ],
      });
      expect(out).toEqual({
        user: { id: "u1", token: "[redacted]" },
        events: [
          { name: "login", session: "[redacted]" },
          { name: "logout", ok: true },
        ],
      });
    });

    it("passes primitives and arrays of primitives through", () => {
      expect(sanitizeMetadata(null)).toBeNull();
      expect(sanitizeMetadata(42)).toBe(42);
      expect(sanitizeMetadata("hi")).toBe("hi");
      expect(sanitizeMetadata([1, "x", true])).toEqual([1, "x", true]);
    });

    it("does not mutate the input", () => {
      const input = { password: "hunter2", nested: { token: "x" } };
      sanitizeMetadata(input);
      expect(input).toEqual({ password: "hunter2", nested: { token: "x" } });
    });

    it("handles empty objects and arrays", () => {
      expect(sanitizeMetadata({})).toEqual({});
      expect(sanitizeMetadata([])).toEqual([]);
    });
  });
});
