import { describe, it, expect } from "vitest";
import manifest from "../src/lib/hub/manifest.json";
import { checkDimensionKeys, rollupDimensions, describeDimensionCheck } from "../src/lib/hub/dimensions";

describe("dimension registry", () => {
  it("manifest is 1.12.0 with crm_rule and spine", () => {
    expect(manifest.version).toBe("1.12.0");
    expect((manifest.contracts as Record<string, string>)["crm_rule"]).toContain("Only the Hub writes to HubSpot");
    expect(manifest.dimensions.spine).toEqual(["technology", "commercial", "investment", "operational", "regulatory"]);
  });
  it("tariffiq registry has supplyChain unchanged", () => {
    expect(manifest.dimensions.by_assessment.tariffiq).toContain("supplyChain");
  });
  it("ok when keys match", () => {
    const d = Object.fromEntries(manifest.dimensions.by_assessment.tariffiq.map((k) => [k, 50]));
    expect(checkDimensionKeys("tariffiq", d).dimension_keys_ok).toBe(true);
  });
  it("flags unknown and missing", () => {
    const c = checkDimensionKeys("gtmiq", { technology: 1, "Market Readiness": 2 });
    expect(c.unknown).toEqual(["Market Readiness"]);
    expect(c.missing).toHaveLength(8);
    expect(describeDimensionCheck(c)).toBe("1 unknown / 8 missing");
  });
  it("empty", () => { expect(describeDimensionCheck(checkDimensionKeys("tariffiq", {}))).toBe("empty"); });
  it("uxiq has no registry", () => { expect(describeDimensionCheck(checkDimensionKeys("uxiq", { a: 1 }))).toBe("no registry yet"); });
  it("roll-up merges only spine keys across assessments", () => {
    const out = rollupDimensions([
      { assessment_key: "gtmiq", display_name: "GTMIQ", dimensions: [{ key: "technology", label: "Technology", score: 40 }, { key: "market", label: "Market", score: 70 }] },
      { assessment_key: "salesiq", display_name: "SalesIQ", dimensions: [{ key: "technology", label: "Tech", score: 60 }, { key: "market", label: "Market", score: 10 }] },
    ]);
    expect(out.find((d) => d.key === "technology")?.score).toBe(50);
    expect(out.filter((d) => d.label === "Market")).toHaveLength(2);
  });
});
