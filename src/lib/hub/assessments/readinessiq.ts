import type { AssessmentSpec, SubmissionForMapping } from "./types";

/** ReadinessIQ spec — PLACEHOLDER; replace with real fields when confirmed. */
const prefix = "gem_readiness";

export const readinessiq: AssessmentSpec = {
  key: "readinessiq",
  displayName: "ReadinessIQ",
  contactProperties: [
    { name: `${prefix}_score`, label: "GEM ReadinessIQ Score", type: "number" },
    { name: `${prefix}_tier`, label: "GEM ReadinessIQ Tier", type: "enum",
      options: [
        { label: "At risk", value: "at_risk" },
        { label: "Developing", value: "developing" },
        { label: "Optimized", value: "optimized" },
      ] },
    { name: `${prefix}_completed_at`, label: "GEM ReadinessIQ Completed At", type: "date" },
  ],
  toContactProperties: (s: SubmissionForMapping) => ({
    [`${prefix}_score`]: s.score,
    [`${prefix}_tier`]: s.tier,
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
