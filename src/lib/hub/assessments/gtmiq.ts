import { makeReadinessFamilySpec } from "./readiness-family";

/** GTMIQ — Market / go-to-market readiness (ReadinessIQ sub-product "market"). */
export const gtmiq = makeReadinessFamilySpec({
  key: "gtmiq",
  displayName: "GTMIQ",
  prefix: "gem_gtm",
  dimensions: {
    technology: "Technology readiness",
    market: "Market readiness",
    commercial: "Commercial readiness",
    operational: "Operational readiness",
    investment: "Investment readiness",
    integration: "System integration",
    cultural: "Cultural readiness",
    newmarket: "Growth readiness",
    regulatory: "Regulatory & compliance",
  },
});
