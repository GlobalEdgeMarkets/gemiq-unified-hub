import { describe, expect, it } from "vitest";
import { shouldCheckExistingTrial } from "../src/lib/auth-checkout";

describe("signed-in checkout intent", () => {
  it("does not block the plan-only Unlock full report purchase for trial users", () => {
    const unlock = { plan: "complete", trial: undefined };
    expect(shouldCheckExistingTrial(unlock, null)).toBe(false);
  });
  it("does not block an extra single assessment purchase for active subscribers", () => {
    expect(shouldCheckExistingTrial({ buy: "single" }, null)).toBe(false);
  });
  it("preserves single purchase precedence even with a trial tag", () => {
    expect(shouldCheckExistingTrial({ buy: "single", trial: "1" }, null)).toBe(false);
  });
  it("checks existing access to avoid starting a duplicate 7-day trial", () => {
    expect(shouldCheckExistingTrial({ trial: "1" }, null)).toBe(true);
  });
  it("keeps IQ return journeys out of Hub checkout", () => {
    expect(shouldCheckExistingTrial({ trial: "1" }, "https://uxiq.globaledgemarkets.com")).toBe(false);
  });
});