import { z } from "zod";

export const ASSESSMENT_KEYS = ["tariffiq", "readinessiq", "uxiq", "techservicesiq"] as const;
export type AssessmentKey = (typeof ASSESSMENT_KEYS)[number];

export const SubmissionPayloadSchema = z.object({
  email: z.string().email(),
  assessment_key: z.enum(ASSESSMENT_KEYS),
  score: z.number().nullable().optional(),
  tier: z.string().max(64).nullable().optional(),
  dimensions: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).optional(),
  answers: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  submitted_at: z.string().datetime().optional(),
});
export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;
