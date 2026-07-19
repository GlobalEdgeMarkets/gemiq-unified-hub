import { z } from "zod";
import { ASSESSMENT_KEYS as REGISTRY_KEYS } from "./assessments";

/**
 * Accepted assessment_key values. Sourced from the registry so a new IQ file
 * is enough to make it a valid submission — no schema edit required.
 */
export const ASSESSMENT_KEYS = REGISTRY_KEYS as readonly string[];

export const SubmissionPayloadSchema = z.object({
  email: z.string().email(),
  assessment_key: z.string().refine(k => REGISTRY_KEYS.includes(k), {
    message: `assessment_key must be one of: ${REGISTRY_KEYS.join(", ")}`,
  }),
  score: z.number().nullable().optional(),
  tier: z.string().max(64).nullable().optional(),
  dimensions: z.record(z.string(), z.union([z.number(), z.string(), z.null()])).optional(),
  /** IQ-specific rich payload. Stored verbatim; drives per-IQ HubSpot mapping. */
  detail: z.record(z.string(), z.any()).optional(),
  answers: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  submitted_at: z.string().datetime().optional(),
});
export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>;
