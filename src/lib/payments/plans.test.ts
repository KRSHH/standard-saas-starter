import { describe, expect, it } from "vitest";

import { PLANS, TRIAL_DAYS } from "@/lib/payments/plans";

describe("PLANS config", () => {
  it("has starter and pro plans", () => {
    expect(PLANS.starter.slug).toBe("starter");
    expect(PLANS.pro.slug).toBe("pro");
  });

  it("prices are in USD cents", () => {
    expect(PLANS.starter.priceCents).toBe(PLANS.starter.priceUsd * 100);
    expect(PLANS.pro.priceCents).toBe(PLANS.pro.priceUsd * 100);
  });

  it("pro plan costs more than starter plan", () => {
    expect(PLANS.pro.priceUsd).toBeGreaterThan(PLANS.starter.priceUsd);
  });

  it("trial is 14 days", () => {
    expect(TRIAL_DAYS).toBe(14);
  });
});
