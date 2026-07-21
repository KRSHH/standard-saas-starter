import { describe, expect, it } from "vitest";

import { isEntitled } from "@/lib/payments/entitlement";

describe("isEntitled (subscription gate)", () => {
  it("returns false for null subscription", () => {
    expect(isEntitled(null)).toBe(false);
  });

  it("returns true for trialing", () => {
    expect(isEntitled({ status: "trialing" })).toBe(true);
  });

  it("returns true for active", () => {
    expect(isEntitled({ status: "active" })).toBe(true);
  });

  it("returns false for past_due (gate fails until payment recovers)", () => {
    expect(isEntitled({ status: "past_due" })).toBe(false);
  });

  it("returns false for canceled", () => {
    expect(isEntitled({ status: "canceled" })).toBe(false);
  });

  it("returns false for paused", () => {
    expect(isEntitled({ status: "paused" })).toBe(false);
  });
});
