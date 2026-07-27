import { makeReadinessFamilySpec } from "./readiness-family";

/** ProductIQ — Productization readiness (ReadinessIQ sub-product "productization"). */
export const productiq = makeReadinessFamilySpec({
  key: "productiq",
  displayName: "ProductIQ",
  prefix: "gem_product",
  dimensions: {
    technology: "Technology readiness",
    packaging: "Packaging & pricing",
    documentation: "Documentation & knowledge",
    scalability: "Scalability & automation",
    commercial: "Commercial readiness",
    investment: "Investment readiness",
    operational: "Operational readiness",
    regulatory: "Regulatory & compliance",
    "ux-selfservice": "UX & self-service",
  },
});
