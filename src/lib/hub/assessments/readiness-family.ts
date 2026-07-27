import type { AssessmentSpec, SubmissionForMapping } from "./types";
import { CANONICAL_TIER_OPTIONS, normalizeTier, tierFromScore } from "./tiers";

/**
 * Shared builder for the four ReadinessIQ-family IQs.
 *
 * Dimension keys and labels are lifted verbatim from ReadinessIQ's
 * SUB_PRODUCT_META (src/data/report-content.ts in the ReadinessIQ project):
 *   market → GTMIQ, enterprise → SalesIQ,
 *   productization → ProductIQ, ai → AITransformIQ.
 *
 * Dimension scores are stored as INDIVIDUAL numeric properties (0–100),
 * never JSON — same rule as TariffIQ.
 */

export const SEGMENT_OPTIONS = [
  { label: "Solopreneur", value: "solopreneur" },
  { label: "Founder/CEO", value: "founder_ceo" },
  { label: "Operator", value: "operator" },
  { label: "Investor", value: "investor" },
  { label: "Coach", value: "coach" },
  { label: "Other", value: "other" },
];

/** HubSpot property names must be lowercase snake_case. */
export function dimensionPropName(prefix: string, key: string) {
  return `${prefix}_${key}`
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");
}

export function makeReadinessFamilySpec(args: {
  key: string;
  displayName: string;
  prefix: string;
  /** dimension key → human label, in report order */
  dimensions: Record<string, string>;
}): AssessmentSpec {
  const { key, displayName, prefix, dimensions } = args;
  const dimensionKeys = Object.keys(dimensions);

  return {
    key,
    displayName,
    contactProperties: [
      // Core
      { name: `${prefix}_score`, label: `GEM ${displayName} Score`, type: "number" },
      { name: `${prefix}_tier`, label: `GEM ${displayName} Tier`, type: "enum", options: CANONICAL_TIER_OPTIONS },
      { name: `${prefix}_completed_at`, label: `GEM ${displayName} Completed At`, type: "date" },

      // Respondent profile
      { name: `${prefix}_segment`, label: `GEM ${displayName} Segment`, type: "enum", options: SEGMENT_OPTIONS },
      { name: `${prefix}_industry`, label: `GEM ${displayName} Industry`, type: "string" },

      // Outcomes
      { name: `${prefix}_top_priorities`, label: `GEM ${displayName} Top Priorities`, type: "string", description: "Semicolon-joined top 3 dimension gaps" },
      { name: `${prefix}_assessment_status`, label: `GEM ${displayName} Assessment Status`, type: "string" },
      { name: `${prefix}_resume_token`, label: `GEM ${displayName} Resume Token`, type: "string" },
      { name: `${prefix}_pdf_report`, label: `GEM ${displayName} PDF - Report`, type: "string" },

      // Dimension sub-scores (0–100)
      ...dimensionKeys.map((k) => ({
        name: dimensionPropName(prefix, k),
        label: `GEM ${displayName} – ${dimensions[k]}`,
        type: "number" as const,
      })),
    ],

    toContactProperties: (s: SubmissionForMapping) => {
      const d = (s.detail ?? {}) as Record<string, unknown>;
      const dims = (s.dimensions ?? {}) as Record<string, unknown>;
      const pdfs = (d.pdfUrls ?? {}) as Record<string, unknown>;

      const out: Record<string, string | number | null | undefined> = {
        [`${prefix}_score`]: s.score,
        [`${prefix}_tier`]: normalizeTier(s.tier) ?? tierFromScore(s.score),
        [`${prefix}_completed_at`]: s.submitted_at.slice(0, 10),

        [`${prefix}_segment`]: normalizeSegment(d.segment ?? d.role),
        [`${prefix}_industry`]: asString(d.industry),

        [`${prefix}_top_priorities`]: Array.isArray(d.topPriorities)
          ? d.topPriorities.join("; ")
          : asString(d.topPriorities),
        [`${prefix}_assessment_status`]: asString(d.assessmentStatus),
        [`${prefix}_resume_token`]: asString(d.resumeToken),
        [`${prefix}_pdf_report`]: asString(pdfs.report ?? d.pdfUrl ?? d.reportUrl),
      };

      for (const k of dimensionKeys) {
        out[dimensionPropName(prefix, k)] = asNumber(dims[k]);
      }
      return out;
    },
  };
}

function normalizeSegment(v: unknown): string | null {
  if (v == null) return null;
  const k = String(v).trim().toLowerCase().replace(/[\s/]+/g, "_");
  const allowed = new Set(SEGMENT_OPTIONS.map((o) => o.value));
  return allowed.has(k) ? k : "other";
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
