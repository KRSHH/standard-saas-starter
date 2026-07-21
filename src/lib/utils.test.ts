import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn (className merge)", () => {
  it("merges plain classes", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves Tailwind conflicts — last wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional + falsy values", () => {
    expect(cn("base", false && "no", true && "yes", null, undefined)).toBe(
      "base yes",
    );
  });
});
