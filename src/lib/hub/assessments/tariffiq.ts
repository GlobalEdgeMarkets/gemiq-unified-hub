import type { AssessmentSpec, SubmissionForMapping } from "./types";

/**
 * TariffIQ spec — PLACEHOLDER properties.
 * Replace the `contactProperties` list and `toContactProperties` mapper with the
 * real per-IQ fields once the TariffIQ team confirms exactly what they'll pass
 * inside `submission.detail`. Every property name MUST start with `gem_tariff_`.
 */
const prefix = "gem_tariff";

export const tariffiq: AssessmentSpec = {
  key: "tariffiq",
  displayName: "TariffIQ",
  contactProperties: [
    { name: `${prefix}_score`, label: "GEM TariffIQ Score", type: "number" },
    { name: `${prefix}_tier`, label: "GEM TariffIQ Tier", type: "enum",
      options: [
        { label: "At risk", value: "at_risk" },
        { label: "Developing", value: "developing" },
        { label: "Optimized", value: "optimized" },
      ] },
    { name: `${prefix}_completed_at`, label: "GEM TariffIQ Completed At", type: "date" },
    // Add per-dimension fields as they're finalized, e.g.:
    // { name: `${prefix}_supply_chain`, label: "TariffIQ Supply Chain", type: "number" },
  ],
  toContactProperties: (s: SubmissionForMapping) => ({
    [`${prefix}_score`]: s.score,
    [`${prefix}_tier`]: s.tier,
    [`${prefix}_completed_at`]: s.submitted_at.slice(0, 10),
    // Flatten dimensions as gem_tariff_<dim>
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
