import { makeReadinessFamilySpec } from "./readiness-family";

/** AITransformIQ — AI transformation readiness (ReadinessIQ sub-product "ai"). */
export const aitransformiq = makeReadinessFamilySpec({
  key: "aitransformiq",
  displayName: "AITransformIQ",
  prefix: "gem_aitransform",
  dimensions: {
    "ai-strategy": "AI strategy & vision",
    "data-infrastructure": "Data infrastructure",
    technology: "AI technology readiness",
    "ai-talent": "AI talent & skills",
    "ai-governance": "AI governance & ethics",
    commercial: "Commercial AI readiness",
    investment: "Investment readiness",
    operational: "AI operations readiness",
    regulatory: "AI regulatory readiness",
  },
});
