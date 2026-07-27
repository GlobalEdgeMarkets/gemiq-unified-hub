import type { AssessmentSpec, SubmissionForMapping } from "./types";
import { CANONICAL_TIER_OPTIONS, normalizeTier, tierFromScore } from "./tiers";

/** TechServicesIQ spec — PLACEHOLDER; replace with real fields when confirmed. */
const prefix = "gem_techsvc";

export const techservicesiq: AssessmentSpec = {
  key: "techservicesiq",
  displayName: "TechServicesIQ",
  contactProperties: [
    { name: `${prefix}_score`, label: "GEM TechServicesIQ Score", type: "number" },
    { name: `${prefix}_tier`, label: "GEM TechServicesIQ Tier", type: "enum", options: CANONICAL_TIER_OPTIONS },
    { name: `${prefix}_completed_at`, label: "GEM TechServicesIQ Completed At", type: "date" },
  ],
  toContactProperties: (s: SubmissionForMapping) => ({
    [`${prefix}_score`]: s.score,
    [`${prefix}_tier`]: normalizeTier(s.tier) ?? tierFromScore(s.score),
    [`${prefix}_completed_at`]: s.submitted_at.slice(0, 10),
    ...flattenDimensions(prefix, s.dimensions),
  }),
};

function flattenDimensions(pfx: string, dims: Record<string, unknown> | null | undefined) {
  const out: Record<string, string | number | null> = {};
  if (!dims) return out;
  for (const [k, v] of Object.entries(dims)) {
    if (v == null) continue;
    if (typeof v !== "number" && typeof v !== "string") continue;
    const key = `${pfx}_${k}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    out[key] = v;
  }
  return out;
}
