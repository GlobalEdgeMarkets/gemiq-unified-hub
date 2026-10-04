// Report settings shape, defaults and pure helpers. Client-safe (no DB, no secrets).
// Stored in hub_report_settings: one "global" row + optional per-app override rows.

export const SECTION_KEYS = [
  "summary",
  "score_tier",
  "dimensions",
  "strengths",
  "gaps",
  "recommendations",
  "next_steps",
  "talk_to_gem",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Summary",
  score_tier: "Score & tier",
  dimensions: "Dimension breakdown",
  strengths: "Strengths",
  gaps: "Gaps",
  recommendations: "Recommendations",
  next_steps: "Next steps",
  talk_to_gem: "Talk to GEM",
};

export type TrialAccess = "score" | "score_tier" | "score_tier_dimensions";
export type ReportMode = "app" | "hub";
export type TierDef = { key: string; label: string; min: number; color: string };

export type ReportSettings = {
  sections: { key: SectionKey; enabled: boolean }[];
  trial_access: TrialAccess;
  copy: {
    title_pattern: string;
    intro: string;
    disclaimer: string;
    closing_message: string;
    closing_cta: string;
    closing_url: string;
  };
  tiers: TierDef[];
  mode: ReportMode;
};

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  sections: SECTION_KEYS.map((key) => ({ key, enabled: true })),
  trial_access: "score_tier",
  copy: {
    title_pattern: "{assessment} report for {company}",
    intro: "Here is where you stand today, what is working, and what to do next.",
    disclaimer:
      "This report is a diagnostic based on your answers. It is not legal, tax or financial advice.",
    closing_message: "Want help turning these findings into a plan? Talk to the GEM team.",
    closing_cta: "Talk to GEM",
    closing_url: "https://globaledgemarkets.com/contact",
  },
  tiers: [
    { key: "reactive", label: "Reactive", min: 0, color: "#E5484D" },
    { key: "developing", label: "Developing", min: 40, color: "#F5A524" },
    { key: "defined", label: "Defined", min: 55, color: "#2C365B" },
    { key: "advanced", label: "Advanced", min: 70, color: "#2D1594" },
    { key: "optimized", label: "Optimized", min: 85, color: "#05CFAB" },
  ],
  mode: "app",
};

export type ReportOverride = Partial<Omit<ReportSettings, "copy">> & { copy?: Partial<ReportSettings["copy"]> };

/** Global settings (already merged over defaults) + an app's partial override. */
export function mergeSettings(base: ReportOverride | null | undefined, over?: ReportOverride | null): ReportSettings {
  const b = { ...DEFAULT_REPORT_SETTINGS, ...(base ?? {}), copy: { ...DEFAULT_REPORT_SETTINGS.copy, ...(base?.copy ?? {}) } };
  if (!over) return normalize(b);
  return normalize({
    ...b,
    ...over,
    copy: { ...b.copy, ...(over.copy ?? {}) },
  });
}

function normalize(s: ReportSettings): ReportSettings {
  // Keep every known section exactly once, in the stored order.
  const seen = new Set<string>();
  const sections = (s.sections ?? []).filter((x) => SECTION_KEYS.includes(x.key) && !seen.has(x.key) && seen.add(x.key));
  for (const k of SECTION_KEYS) if (!seen.has(k)) sections.push({ key: k, enabled: false });
  const tiers = [...(s.tiers?.length ? s.tiers : DEFAULT_REPORT_SETTINGS.tiers)].sort((a, b) => a.min - b.min);
  return { ...s, sections, tiers };
}

/** Sections a locked (trial) viewer may see. */
export function trialSections(access: TrialAccess): SectionKey[] {
  if (access === "score") return ["score_tier"];
  if (access === "score_tier") return ["score_tier"];
  return ["score_tier", "dimensions"];
}

export function tierFor(score: number | null, tiers: TierDef[]): TierDef | null {
  if (score == null) return null;
  let hit: TierDef | null = null;
  for (const t of tiers) if (score >= t.min) hit = t;
  return hit;
}

/** Final lock decision: admin override wins, else trial runs stay locked until a plan is active. */
export function isReportLocked(row: { report_unlocked_override: boolean | null; metadata: unknown }, planActive: boolean): boolean {
  if (row.report_unlocked_override === true) return false;
  if (row.report_unlocked_override === false) return true;
  const ent = row.metadata && typeof row.metadata === "object" ? (row.metadata as { entitlement?: unknown }).entitlement : null;
  return !planActive && ent === "trial";
}

export function reportTitle(pattern: string, vars: { assessment: string; company?: string | null; name?: string | null }): string {
  return pattern
    .replace("{assessment}", vars.assessment)
    .replace("{company}", vars.company || vars.name || "you")
    .replace("{name}", vars.name || "you")
    .replace(/\s+for you$/, "");
}
