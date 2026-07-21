import type { AssessmentSpec, SubmissionForMapping } from "./types";

/**
 * TariffIQ spec — real field mapping.
 * All property names MUST start with `gem_tariff_`.
 *
 * Top-level (from submission root):
 *   score, tier, dimensions{hts,fta,coo,drawback,valuation,supplyChain,governance,intelligence}
 *
 * From submission.detail:
 *   role, industry, importSpend, primaryConcern (semicolon-joined multi),
 *   savingsLow, savingsHigh, topPriorities[], assessmentStatus, resumeToken, pdfUrls
 */
const prefix = "gem_tariff";

const TIER_OPTIONS = [
  { label: "Reactive",   value: "reactive" },
  { label: "Developing", value: "developing" },
  { label: "Defined",    value: "defined" },
  { label: "Advanced",   value: "advanced" },
  { label: "Optimized",  value: "optimized" },
];

const ROLE_OPTIONS = [
  { label: "CFO",              value: "cfo" },
  { label: "Supply Chain",     value: "supply_chain" },
  { label: "Compliance",       value: "compliance" },
  { label: "C-Suite",          value: "csuite" },
  { label: "Other",            value: "other" },
];

const IMPORT_SPEND_OPTIONS = [
  { label: "Under $5M",    value: "under_5m" },
  { label: "$5M – $50M",   value: "5m_50m" },
  { label: "$50M – $250M", value: "50m_250m" },
  { label: "$250M+",       value: "250m_plus" },
];

const DIMENSION_KEYS = [
  "hts", "fta", "coo", "drawback",
  "valuation", "supplyChain", "governance", "intelligence",
] as const;

// HubSpot property names must be lowercase snake_case.
function propNameForDimension(k: string) {
  return `${prefix}_${k.replace(/([A-Z])/g, "_$1").toLowerCase()}`;
}

export const tariffiq: AssessmentSpec = {
  key: "tariffiq",
  displayName: "TariffIQ",
  contactProperties: [
    // Core
    { name: `${prefix}_score`,        label: "GEM TariffIQ Score",        type: "number" },
    { name: `${prefix}_tier`,         label: "GEM TariffIQ Tier",         type: "enum",     options: TIER_OPTIONS },
    { name: `${prefix}_completed_at`, label: "GEM TariffIQ Completed At", type: "date" },

    // Respondent profile (from detail)
    { name: `${prefix}_role`,             label: "GEM TariffIQ Role",             type: "enum",   options: ROLE_OPTIONS },
    { name: `${prefix}_industry`,         label: "GEM TariffIQ Industry",         type: "string" },
    { name: `${prefix}_import_spend`,     label: "GEM TariffIQ Import Spend",     type: "enum",   options: IMPORT_SPEND_OPTIONS },
    { name: `${prefix}_primary_concern`,  label: "GEM TariffIQ Primary Concern",  type: "string", description: "Semicolon-joined multi-select" },

    // Outcomes
    { name: `${prefix}_savings_low`,      label: "GEM TariffIQ Savings Low (USD, annual)",  type: "number" },
    { name: `${prefix}_savings_high`,     label: "GEM TariffIQ Savings High (USD, annual)", type: "number" },
    { name: `${prefix}_top_priorities`,   label: "GEM TariffIQ Top Priorities",             type: "string", description: "Semicolon-joined top 3" },
    { name: `${prefix}_assessment_status`, label: "GEM TariffIQ Assessment Status",         type: "string" },
    { name: `${prefix}_resume_token`,     label: "GEM TariffIQ Resume Token",               type: "string" },

    // PDFs
    { name: `${prefix}_pdf_report`,          label: "GEM TariffIQ PDF - Report",          type: "string" },
    { name: `${prefix}_pdf_recommendations`, label: "GEM TariffIQ PDF - Recommendations", type: "string" },
    { name: `${prefix}_pdf_answers`,         label: "GEM TariffIQ PDF - Answers",         type: "string" },

    // Dimension sub-scores (0–100)
    ...DIMENSION_KEYS.map((k) => ({
      name: propNameForDimension(k),
      label: `GEM TariffIQ – ${labelForDimension(k)}`,
      type: "number" as const,
    })),
  ],

  toContactProperties: (s: SubmissionForMapping) => {
    const d = (s.detail ?? {}) as Record<string, unknown>;
    const dims = (s.dimensions ?? {}) as Record<string, unknown>;
    const pdfs = (d.pdfUrls ?? {}) as Record<string, unknown>;

    const out: Record<string, string | number | null | undefined> = {
      [`${prefix}_score`]:        s.score,
      [`${prefix}_tier`]:         s.tier?.toLowerCase(),
      [`${prefix}_completed_at`]: s.submitted_at.slice(0, 10),

      [`${prefix}_role`]:            asString(d.role),
      [`${prefix}_industry`]:        asString(d.industry),
      [`${prefix}_import_spend`]:    asString(d.importSpend),
      [`${prefix}_primary_concern`]: asString(d.primaryConcern),

      [`${prefix}_savings_low`]:       asNumber(d.savingsLow),
      [`${prefix}_savings_high`]:      asNumber(d.savingsHigh),
      [`${prefix}_top_priorities`]:    Array.isArray(d.topPriorities) ? d.topPriorities.join("; ") : asString(d.topPriorities),
      [`${prefix}_assessment_status`]: asString(d.assessmentStatus),
      [`${prefix}_resume_token`]:      asString(d.resumeToken),

      [`${prefix}_pdf_report`]:          asString(pdfs.report),
      [`${prefix}_pdf_recommendations`]: asString(pdfs.recommendations),
      [`${prefix}_pdf_answers`]:         asString(pdfs.answers),
    };

    for (const k of DIMENSION_KEYS) {
      out[propNameForDimension(k)] = asNumber(dims[k]);
    }
    return out;
  },
};

function labelForDimension(k: string): string {
  const map: Record<string, string> = {
    hts: "HTS Classification",
    fta: "FTA Utilization",
    coo: "Country of Origin",
    drawback: "Duty Drawback",
    valuation: "Customs Valuation",
    supplyChain: "Supply Chain Resilience",
    governance: "Trade Governance",
    intelligence: "Tariff Intelligence",
  };
  return map[k] ?? k;
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : String(v);
}

function asNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
