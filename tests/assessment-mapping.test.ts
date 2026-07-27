import { describe, expect, it } from "vitest";
import { normalizeTier, tierFromScore, CANONICAL_TIER_OPTIONS } from "@/lib/hub/assessments/tiers";
import { canonKey } from "@/lib/hub/assessments/readiness-family";
import { gtmiq } from "@/lib/hub/assessments/gtmiq";
import { salesiq } from "@/lib/hub/assessments/salesiq";
import { productiq } from "@/lib/hub/assessments/productiq";
import { aitransformiq } from "@/lib/hub/assessments/aitransformiq";
import { REGISTRY } from "@/lib/hub/assessments";

describe("normalizeTier", () => {
  it("passes canonical values through, including the two most common live ones", () => {
    for (const { value } of CANONICAL_TIER_OPTIONS) {
      expect(normalizeTier(value)).toBe(value);
    }
    expect(normalizeTier("Defined")).toBe("defined");
    expect(normalizeTier("Advanced")).toBe("advanced");
  });

  it("maps ReadinessIQ labels", () => {
    expect(normalizeTier("NotReady")).toBe("reactive");
    expect(normalizeTier("Not Ready")).toBe("reactive");
    expect(normalizeTier("Building")).toBe("developing");
    expect(normalizeTier("Ready")).toBe("optimized");
    expect(normalizeTier("At Risk")).toBe("reactive");
  });

  it("falls back to score-derived tier when unmappable", () => {
    expect(normalizeTier("wat")).toBeNull();
    expect(tierFromScore(66)).toBe("defined");
    expect(tierFromScore(30)).toBe("reactive");
    expect(tierFromScore(95)).toBe("optimized");
  });
});

describe("dimension key matching", () => {
  const cases = [gtmiq, salesiq, productiq, aitransformiq];

  it("folds hyphens, camelCase, spaces and prefixes to one canonical key", () => {
    expect(canonKey("ai-strategy")).toBe(canonKey("aiStrategy"));
    expect(canonKey("AI Strategy")).toBe(canonKey("ai_strategy"));
  });

  for (const spec of cases) {
    it(`${spec.key}: populates every dimension from hyphenated input keys`, () => {
      const dimProps = spec.contactProperties
        .map(p => p.name)
        .filter(n => p_isDimension(n, spec.contactProperties.map(x => x.name)));

      // Build a dimensions object using hyphenated variants of each dim name.
      const prefix = dimProps[0].split("_").slice(0, 2).join("_");
      const dims: Record<string, number> = {};
      dimProps.forEach((name, i) => {
        dims[name.slice(prefix.length + 1).replace(/_/g, "-")] = 40 + i;
      });

      const out = spec.toContactProperties({
        email: "qa@example.com",
        assessment_key: spec.key,
        score: 66,
        tier: "Defined",
        dimensions: dims,
        detail: {},
        submitted_at: "2026-07-27T00:00:00.000Z",
      });

      for (const name of dimProps) expect(out[name], name).toBeTypeOf("number");
      expect(out[`${prefix}_tier`]).toBe("defined");
    });
  }
});

describe("registry", () => {
  it("registers all eight IQ keys", () => {
    expect(REGISTRY.map(s => s.key).sort()).toEqual(
      ["aitransformiq", "gtmiq", "productiq", "readinessiq", "salesiq", "tariffiq", "techservicesiq", "uxiq"],
    );
  });
});

/** A dimension property is a numeric prefix_* field that isn't a core/profile field. */
function p_isDimension(name: string, _all: string[]) {
  const core = ["score", "tier", "completed_at", "segment", "industry", "top_priorities", "assessment_status", "resume_token", "pdf_report"];
  return !core.some(c => name.endsWith(`_${c}`));
}
