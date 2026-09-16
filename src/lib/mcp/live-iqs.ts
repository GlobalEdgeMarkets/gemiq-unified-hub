import manifest from "../hub/manifest.json";

/**
 * Live IQ keys and names, derived from the central manifest (the single source
 * of truth for the catalog). Import-safe: plain JSON, no env reads, no I/O.
 *
 * Adding or retiring an IQ in manifest.json updates the MCP tool descriptions
 * and the list_submissions filter automatically — no edit needed here.
 */
const ASSESSMENTS = manifest.assessments as ReadonlyArray<{
  key: string;
  name: string;
  url: string;
  track: string;
}>;

export const LIVE_IQ_KEYS = ASSESSMENTS.map((a) => a.key) as [string, ...string[]];

export const LIVE_IQ_NAMES = ASSESSMENTS.map((a) => a.name).join(", ");

/** e.g. "GTMIQ (gtmiq), SalesIQ (salesiq), …" — for tool descriptions. */
export const LIVE_IQ_LABELS = ASSESSMENTS.map((a) => `${a.name} (${a.key})`).join(", ");
