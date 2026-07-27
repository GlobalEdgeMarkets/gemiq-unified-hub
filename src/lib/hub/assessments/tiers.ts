import type { PropertyDef } from "./types";

/**
 * Canonical GEM.IQ maturity tiers. Every IQ tier property uses these five
 * values — mirrors CANONICAL_TIERS in src/lib/hub/admin/hubspot-bootstrap.server.ts.
 */
export const CANONICAL_TIER_OPTIONS: NonNullable<PropertyDef["options"]> = [
  { label: "Reactive", value: "reactive" },
  { label: "Developing", value: "developing" },
  { label: "Defined", value: "defined" },
  { label: "Advanced", value: "advanced" },
  { label: "Optimized", value: "optimized" },
];

const ALIASES: Record<string, string> = {
  // legacy three-tier template
  at_risk: "reactive",
  atrisk: "reactive",
  "at risk": "reactive",
  // ReadinessIQ tier keys
  notready: "reactive",
  not_ready: "reactive",
  "not ready": "reactive",
  building: "developing",
  ready: "optimized",
  // legacy TariffIQ labels
  novice: "reactive",
  beginner: "reactive",
  emerging: "developing",
  basic: "developing",
  competent: "defined",
  proficient: "advanced",
  expert: "optimized",
  leader: "optimized",

  // canonical passthrough
  reactive: "reactive",
  developing: "developing",
  defined: "defined",
  advanced: "advanced",
  optimized: "optimized",
};

/** Normalize any incoming tier label to one of the five canonical values. */
export function normalizeTier(tier: string | null | undefined): string | null {
  if (!tier) return null;
  const k = String(tier).trim().toLowerCase().replace(/\s+/g, "_");
  return ALIASES[k] ?? ALIASES[k.replace(/_/g, " ")] ?? null;
}

/** Score (0–100) → canonical tier, used when an IQ sends no tier. */
export function tierFromScore(score: number | null | undefined): string | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score < 40) return "reactive";
  if (score < 55) return "developing";
  if (score < 70) return "defined";
  if (score < 85) return "advanced";
  return "optimized";
}
