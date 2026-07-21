import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/notifications/tokens";

describe("unsubscribe tokens", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a global unsubscribe token", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "test-secret");
    const token = signUnsubscribeToken({ userId: "u-123" });
    const result = verifyUnsubscribeToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u-123");
      expect(result.category).toBeUndefined();
    }
  });

  it("round-trips a per-category unsubscribe token", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "test-secret");
    const token = signUnsubscribeToken({
      userId: "u-123",
      category: "billing",
    });
    const result = verifyUnsubscribeToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u-123");
      expect(result.category).toBe("billing");
    }
  });

  it("rejects a token signed with a different secret", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "secret-a");
    const token = signUnsubscribeToken({ userId: "u-123" });
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "secret-b");
    expect(verifyUnsubscribeToken(token).ok).toBe(false);
  });

  it("rejects a tampered token", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "test-secret");
    const token = signUnsubscribeToken({ userId: "u-123" });
    // Flip the last char of the signature.
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyUnsubscribeToken(tampered).ok).toBe(false);
  });

  it("rejects malformed tokens", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "test-secret");
    expect(verifyUnsubscribeToken("").ok).toBe(false);
    expect(verifyUnsubscribeToken("noseparator").ok).toBe(false);
    expect(verifyUnsubscribeToken("only.signature").ok).toBe(false);
    expect(verifyUnsubscribeToken(".signature").ok).toBe(false);
    expect(verifyUnsubscribeToken("payload.").ok).toBe(false);
  });

  it("rejects a payload that isn't valid JSON", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "test-secret");
    const payload = Buffer.from("not json").toString("base64url");
    const sig = Buffer.from("anything").toString("base64url");
    expect(verifyUnsubscribeToken(`${payload}.${sig}`).ok).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.stubEnv("NOTIFICATIONS_UNSUBSCRIBE_SECRET", "test-secret");
    // Manually craft a payload with a past expiry.
    const payload = JSON.stringify({
      userId: "u-123",
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const sig = createHmac("sha256", "test-secret").update(payloadB64).digest();
    const sigB64 = sig.toString("base64url");
    expect(verifyUnsubscribeToken(`${payloadB64}.${sigB64}`).ok).toBe(false);
  });
});
