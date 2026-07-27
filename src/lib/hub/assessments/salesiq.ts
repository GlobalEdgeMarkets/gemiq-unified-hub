import { makeReadinessFamilySpec } from "./readiness-family";

/** SalesIQ — Enterprise sales readiness (ReadinessIQ sub-product "enterprise"). */
export const salesiq = makeReadinessFamilySpec({
  key: "salesiq",
  displayName: "SalesIQ",
  prefix: "gem_sales",
  dimensions: {
    technology: "Technology readiness",
    "sales-process": "Sales process maturity",
    procurement: "Procurement readiness",
    commercial: "Commercial readiness",
    investment: "Investment readiness",
    "customer-success": "Customer success readiness",
    regulatory: "Regulatory & compliance",
    operational: "Operational readiness",
    "integration-ecosystem": "Integration ecosystem",
  },
});
