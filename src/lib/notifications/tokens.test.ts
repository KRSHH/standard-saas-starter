import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  getSecret,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/notifications/tokens";

// The env schema seeds NOTIFICATIONS_UNSUBSCRIBE_SECRET as undefined in the
// test setup, so getSecret() falls back to the dev-derived value. Tests that
// need a known secret craft tokens directly with createHmac.

describe("unsubscribe tokens", () => {
  it("round-trips a global unsubscribe token", () => {
    const token = signUnsubscribeToken({ userId: "u-123" });
    const result = verifyUnsubscribeToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u-123");
      expect(result.category).toBeUndefined();
    }
  });

  it("round-trips a per-category unsubscribe token", () => {
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
    // Craft a token with a secret that differs from getSecret()'s output.
    const payload = JSON.stringify({
      userId: "u-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const sig = createHmac("sha256", "a-different-secret")
      .update(payloadB64)
      .digest();
    const token = `${payloadB64}.${sig.toString("base64url")}`;
    expect(verifyUnsubscribeToken(token).ok).toBe(false);
  });

  it("rejects a tampered token", () => {
    const token = signUnsubscribeToken({ userId: "u-123" });
    // Flip the last char of the signature.
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(verifyUnsubscribeToken(tampered).ok).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("").ok).toBe(false);
    expect(verifyUnsubscribeToken("noseparator").ok).toBe(false);
    expect(verifyUnsubscribeToken("only.signature").ok).toBe(false);
    expect(verifyUnsubscribeToken(".signature").ok).toBe(false);
    expect(verifyUnsubscribeToken("payload.").ok).toBe(false);
  });

  it("rejects a payload that isn't valid JSON", () => {
    const payload = Buffer.from("not json").toString("base64url");
    const sig = Buffer.from("anything").toString("base64url");
    expect(verifyUnsubscribeToken(`${payload}.${sig}`).ok).toBe(false);
  });

  it("rejects an expired token", () => {
    // Craft a token with a past expiry, signed with the exact secret the
    // verifier uses (via getSecret) so the signature is valid and the
    // verifier reaches the expiry check.
    const payload = JSON.stringify({
      userId: "u-123",
      exp: Math.floor(Date.now() / 1000) - 3600,
    });
    const payloadB64 = Buffer.from(payload).toString("base64url");
    const sig = createHmac("sha256", getSecret()).update(payloadB64).digest();
    expect(
      verifyUnsubscribeToken(`${payloadB64}.${sig.toString("base64url")}`).ok,
    ).toBe(false);
  });
});
