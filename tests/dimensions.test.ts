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

import { buildTestDimensions, pickLatestReal } from "../src/lib/hub/dimensions";
describe("test dimensions + health pick", () => {
  for (const k of ["gtmiq", "salesiq", "productiq", "aitransformiq", "tariffiq"]) {
    it(`${k} test map covers registry`, () => {
      const d = buildTestDimensions(k);
      expect(Object.keys(d).sort()).toEqual([...(manifest.dimensions.by_assessment as Record<string, string[]>)[k]!].sort());
      expect(Object.values(d).every((v) => v >= 0 && v <= 100)).toBe(true);
      expect(checkDimensionKeys(k, d).dimension_keys_ok).toBe(true);
    });
  }
  it("uxiq stays empty", () => { expect(buildTestDimensions("uxiq")).toEqual({}); });
  const isTest = (e: string) => e.includes("+gemtest-");
  it("skips newest test row", () => {
    expect(pickLatestReal([{ email: "a+gemtest-x@b.com" }, { email: "real@b.com" }], isTest)?.email).toBe("real@b.com");
  });
  it("only test rows -> no submissions yet", () => {
    expect(pickLatestReal([{ email: "a+gemtest-x@b.com" }], isTest)).toBeNull();
    expect(describeDimensionCheck(null)).toBe("no submissions yet");
  });
});
