// Client-safe: shape of Hub-controlled assessment content (questions, weights, tiers)
// and the one scoring rule every IQ app must implement identically.
import { z } from "zod";

export const OptionSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(1000),
  /** 0–100 points awarded when this option is chosen. */
  points: z.number().min(0).max(100),
});
export const QuestionSchema = z.object({
  key: z.string().min(1).max(64),
  text: z.string().min(1).max(1500),
  help: z.string().max(1500).optional(),
  /** "Why we ask this" — shown next to the question. */
  rationale: z.string().max(1200).optional(),
  weight: z.number().min(0).max(100).default(1),
  options: z.array(OptionSchema).min(2).max(10),
});
export const SectionSchema = z.object({
  key: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  description: z.string().max(800).optional(),
  /** "Why this matters" — the research or reasoning behind the section. */
  rationale: z.string().max(2000).optional(),
  weight: z.number().min(0).max(100).default(1),
  questions: z.array(QuestionSchema).min(1).max(60),
});
export const ContentTierSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  min: z.number().min(0).max(100),
});
export const AssessmentMethodologySchema = z.object({
  summary: z.string().max(4000).optional(),
  /** Frameworks and research this assessment draws on. */
  frameworks: z.array(z.string().max(300)).max(20).optional(),
  /** How this approach compares with other frameworks. */
  comparison: z.string().max(4000).optional(),
  references: z.array(z.object({ title: z.string().min(1).max(300), url: z.string().url().max(500).optional() })).max(30).optional(),
});
export type AssessmentMethodology = z.infer<typeof AssessmentMethodologySchema>;

export const ContentBodySchema = z.object({
  methodology: AssessmentMethodologySchema.optional(),
  intro: z.string().max(1500).optional(),
  sections: z.array(SectionSchema).min(1).max(20),
  tiers: z.array(ContentTierSchema).min(1).max(10),
  /** Recommendation lines shown for each tier key. */
  tier_recommendations: z.record(z.string(), z.array(z.string().max(600)).max(15)).default({}),
});
export type ContentBody = z.infer<typeof ContentBodySchema>;
export type ContentSection = z.infer<typeof SectionSchema>;
export type ContentQuestion = z.infer<typeof QuestionSchema>;

export const STARTER_CONTENT: ContentBody = {
  intro: "",
  sections: [
    {
      key: "section_1", title: "New section", weight: 1,
      questions: [{
        key: "q1", text: "New question", weight: 1,
        options: [
          { key: "a", label: "Not at all", points: 0 },
          { key: "b", label: "Partly", points: 50 },
          { key: "c", label: "Fully", points: 100 },
        ],
      }],
    },
  ],
  tiers: [
    { key: "reactive", label: "Reactive", min: 0 },
    { key: "developing", label: "Developing", min: 30 },
    { key: "defined", label: "Defined", min: 50 },
    { key: "advanced", label: "Advanced", min: 70 },
    { key: "optimized", label: "Optimized", min: 85 },
  ],
  tier_recommendations: {},
};

/**
 * The scoring rule (published to every IQ in the manifest):
 *   question = points of the chosen option (0–100)
 *   section  = weighted average of its answered questions (question.weight)
 *   overall  = weighted average of answered sections (section.weight), rounded
 *   tier     = the highest tier whose min ≤ overall
 * Unanswered questions are ignored.
 */
export function computeScore(body: ContentBody, answers: Record<string, unknown>) {
  const sections: Record<string, number> = {};
  let tw = 0, ts = 0;
  for (const s of body.sections) {
    let qw = 0, qs = 0;
    for (const q of s.questions) {
      const chosen = answers[q.key];
      const opt = q.options.find((o) => o.key === chosen);
      if (!opt) continue;
      qw += q.weight; qs += q.weight * opt.points;
    }
    if (qw > 0) {
      const sec = qs / qw;
      sections[s.key] = Math.round(sec);
      tw += s.weight; ts += s.weight * sec;
    }
  }
  const score = tw > 0 ? Math.round(ts / tw) : null;
  const tier = score == null ? null : [...body.tiers].sort((a, b) => b.min - a.min).find((t) => score >= t.min) ?? null;
  return { score, tier: tier?.key ?? null, tierLabel: tier?.label ?? null, sections };
}

export function questionCount(body: ContentBody) {
  return body.sections.reduce((n, s) => n + s.questions.length, 0);
}
