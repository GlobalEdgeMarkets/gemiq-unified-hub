// Client-safe: the combined GEM.IQ score rule, its admin settings, and the
// Hub-wide methodology text. The rule is defined ONCE here and restated in
// manifest contracts.composite_rule — change both together.
import { z } from "zod";

export const CompositeTierSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  min: z.number().min(0).max(100),
});

export const CompositeSettingsSchema = z.object({
  /** Relative weight per live assessment key. 0 = excluded. Missing key = 1. */
  weights: z.record(z.string(), z.number().min(0).max(100)).default({}),
  tiers: z.array(CompositeTierSchema).min(1).max(10),
  /** Completed assessments needed before an overall tier is shown. */
  min_for_tier: z.number().int().min(1).max(20).default(2),
});
export type CompositeSettings = z.infer<typeof CompositeSettingsSchema>;

export const DEFAULT_COMPOSITE: CompositeSettings = {
  weights: { gtmiq: 1.25, salesiq: 1.25, productiq: 1, aitransformiq: 1, uxiq: 0.75, tariffiq: 0.75 },
  tiers: [
    { key: "reactive", label: "Reactive", min: 0 },
    { key: "developing", label: "Developing", min: 30 },
    { key: "defined", label: "Defined", min: 50 },
    { key: "advanced", label: "Advanced", min: 70 },
    { key: "optimized", label: "Optimized", min: 85 },
  ],
  min_for_tier: 2,
};

export const MethodologySchema = z.object({
  overview: z.string().max(4000).default(""),
  scoring: z.string().max(4000).default(""),
  maturity_model: z.string().max(4000).default(""),
  data_sources: z.string().max(4000).default(""),
  how_to_read: z.string().max(4000).default(""),
});
export type Methodology = z.infer<typeof MethodologySchema>;

export const DEFAULT_METHODOLOGY: Methodology = {
  overview:
    "GEM.IQ is a family of maturity diagnostics. Each assessment measures one discipline through weighted sections of evidence-based questions, and the combined GEM.IQ score rolls them into one picture of business health.",
  scoring:
    "Every answer carries 0–100 points. A section score is the weighted average of its answered questions; an assessment score is the weighted average of its sections. The combined score is the weighted average of your latest score in each assessment you have completed.",
  maturity_model:
    "Five stages — Reactive, Developing, Defined, Advanced, Optimized — describe how repeatable, measured and improving a capability is, in the tradition of established capability-maturity models.",
  data_sources:
    "Questions draw on recognised frameworks in each discipline and on GEM's market-entry and growth advisory work. Each assessment lists its specific sources.",
  how_to_read:
    "Treat scores as a structured self-assessment, not an audit. The biggest value is in the gaps: the lowest sections show where focused effort moves the overall score most.",
};

export type CompositeInput = { assessment_key: string; score: number | null };

/**
 * The combined score rule:
 *   weight   = settings.weights[key] (default 1; 0 excludes the assessment)
 *   score    = weighted average of the latest score of each completed live assessment, rounded
 *   tier     = highest tier with min ≤ score, only once completed ≥ min_for_tier
 *   next     = the highest-weighted live assessment not yet completed (display order breaks ties)
 */
export function computeComposite(latest: CompositeInput[], liveKeys: string[], s: CompositeSettings) {
  const w = (k: string) => s.weights[k] ?? 1;
  const counted = latest.filter((r) => liveKeys.includes(r.assessment_key) && typeof r.score === "number" && w(r.assessment_key) > 0);
  let tw = 0, ts = 0;
  for (const r of counted) { tw += w(r.assessment_key); ts += w(r.assessment_key) * (r.score as number); }
  const score = tw > 0 ? Math.round(ts / tw) : null;
  const completedKeys = new Set(latest.filter((r) => liveKeys.includes(r.assessment_key)).map((r) => r.assessment_key));
  const completed = completedKeys.size;
  const tierRow = score != null && completed >= s.min_for_tier
    ? [...s.tiers].sort((a, b) => b.min - a.min).find((t) => score >= t.min) ?? null
    : null;
  const missing = liveKeys.filter((k) => !completedKeys.has(k) && w(k) > 0);
  const next = [...missing].sort((a, b) => w(b) - w(a) || liveKeys.indexOf(a) - liveKeys.indexOf(b))[0] ?? null;
  return {
    score,
    tier: tierRow?.key ?? null,
    tierLabel: tierRow?.label ?? null,
    completed,
    total: liveKeys.length,
    missing,
    next,
    needed_for_tier: Math.max(0, s.min_for_tier - completed),
  };
}

export function mergeComposite(raw: unknown): CompositeSettings {
  const p = CompositeSettingsSchema.safeParse({ ...DEFAULT_COMPOSITE, ...((raw as object) ?? {}) });
  return p.success ? p.data : DEFAULT_COMPOSITE;
}
export function mergeMethodology(raw: unknown): Methodology {
  const p = MethodologySchema.safeParse(raw ?? {});
  const m = p.success ? p.data : DEFAULT_METHODOLOGY;
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v || DEFAULT_METHODOLOGY[k as keyof Methodology]])) as Methodology;
}
