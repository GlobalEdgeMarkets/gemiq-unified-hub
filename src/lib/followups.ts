// Client-safe shapes, defaults and text filling for score-based follow-up emails.
export const FOLLOWUP_STEPS = ["tier_advice", "unlock", "retake"] as const;
export type FollowupStepKey = (typeof FOLLOWUP_STEPS)[number];

export type FollowupStep = {
  enabled: boolean;
  delay_days: number;
  subject: string;
  heading: string;
  /** Used for every tier unless a tier-specific body is set. */
  body: string;
  body_low?: string;
  body_mid?: string;
  body_high?: string;
  button_label: string;
};
export type FollowupRules = Record<FollowupStepKey, FollowupStep>;
export type FollowupOverride = Partial<Record<FollowupStepKey, Partial<FollowupStep>>>;

export const STEP_LABELS: Record<FollowupStepKey, { title: string; who: string }> = {
  tier_advice: { title: "Advice by tier", who: "Everyone, text depends on their score band" },
  unlock: { title: "Unlock your full report", who: "Trial users whose report is still locked" },
  retake: { title: "Retake reminder", who: "Everyone" },
};

/** Score bands used for tier-specific text. */
export function band(score: number | null): "low" | "mid" | "high" {
  if (score == null || score < 40) return "low";
  if (score < 70) return "mid";
  return "high";
}

export const DEFAULT_FOLLOWUP_RULES: FollowupRules = {
  tier_advice: {
    enabled: true,
    delay_days: 2,
    subject: "What your {assessment} score of {score} means",
    heading: "Your next move after {assessment}",
    body: "Your {assessment} score was {score} ({tier}). Your report lists the areas that will move your score fastest.",
    body_low:
      "Your {assessment} score of {score} ({tier}) shows real gaps, and that's useful: it tells you exactly where to start. Pick the lowest-scoring area in your report and fix that one first. A 30-minute call with GEM can turn it into a 90-day plan.",
    body_mid:
      "Your {assessment} score of {score} ({tier}) means the foundations are there, but a few areas are holding you back. Your report shows which two will give you the biggest jump.",
    body_high:
      "Your {assessment} score of {score} ({tier}) puts you ahead of most companies we assess. The gains now come from the one or two areas still below your average. Your report shows them.",
    button_label: "Open my report",
  },
  unlock: {
    enabled: true,
    delay_days: 5,
    subject: "Your full {assessment} report is waiting",
    heading: "See everything behind your score",
    body: "You've seen your {assessment} score of {score}. The full report adds your strengths, gaps, and step-by-step recommendations. Start a plan to unlock it, and every other GEM.IQ assessment too.",
    button_label: "Unlock my full report",
  },
  retake: {
    enabled: true,
    delay_days: 90,
    subject: "Time to re-check your {assessment} score",
    heading: "How far have you come?",
    body: "It's been about three months since you scored {score} on {assessment}. Retake it to see what has improved and what still needs work.",
    button_label: "Retake {assessment}",
  },
};

export function mergeRules(base: FollowupOverride | null | undefined, over?: FollowupOverride | null): FollowupRules {
  const out = {} as FollowupRules;
  for (const k of FOLLOWUP_STEPS) out[k] = { ...DEFAULT_FOLLOWUP_RULES[k], ...(base?.[k] ?? {}), ...(over?.[k] ?? {}) };
  return out;
}

export function fill(text: string, v: { name?: string | null; assessment: string; score: number | null; tier?: string | null }): string {
  return text
    .replaceAll("{name}", v.name || "there")
    .replaceAll("{assessment}", v.assessment)
    .replaceAll("{score}", v.score == null ? "—" : String(Math.round(v.score)))
    .replaceAll("{tier}", v.tier || "unrated");
}

export function bodyFor(step: FollowupStep, score: number | null): string {
  const b = band(score);
  return (b === "low" ? step.body_low : b === "mid" ? step.body_mid : step.body_high) || step.body;
}
