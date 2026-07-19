import type { AssessmentSpec, SubmissionForMapping, HubSpotPropertyValues, PropertyDef } from "./types";
import { tariffiq } from "./tariffiq";
import { readinessiq } from "./readinessiq";
import { uxiq } from "./uxiq";
import { techservicesiq } from "./techservicesiq";

/**
 * Central registry of every GEM.IQ assessment.
 * To add a new IQ: create a spec file in this folder and add it to this array.
 * That single change also wires up:
 *   - HubSpot property bootstrap for the new IQ's fields
 *   - Contact-property mapping on every submit
 *   - Rollup counts (gem_assessments_taken / _count / high / low)
 */
export const REGISTRY: AssessmentSpec[] = [
  tariffiq,
  readinessiq,
  uxiq,
  techservicesiq,
];

export const REGISTRY_BY_KEY: Record<string, AssessmentSpec> =
  Object.fromEntries(REGISTRY.map(s => [s.key, s]));

export const ASSESSMENT_KEYS = REGISTRY.map(s => s.key);

/** Property definitions from every registered IQ (for the bootstrap route). */
export function collectAllPropertyDefs(): PropertyDef[] {
  const seen = new Set<string>();
  const out: PropertyDef[] = [];
  for (const spec of REGISTRY) {
    for (const p of spec.contactProperties) {
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      out.push(p);
    }
  }
  return out;
}

/**
 * Build the FULL HubSpot property map for a contact based on ALL their
 * submissions to date. This is what the Hub PATCHes to HubSpot on every
 * submit — single API call combining:
 *   1. Latest-per-IQ fields (from each registered spec's mapper)
 *   2. Rollup fields (customer flag, counts, high/low, assessments-taken)
 *   3. Workflow-trigger fields (gem_assessment_tool + gem_assessment_date
 *      refreshed to the NEW submission)
 */
export function buildContactProperties(args: {
  email: string;
  /** All submissions for this email, newest first. */
  history: SubmissionForMapping[];
  /** The submission that just landed (drives workflow-trigger refresh). */
  current: SubmissionForMapping;
  /** Optional identity fields lifted from submission.metadata. */
  contact?: { first_name?: string; last_name?: string; company?: string; phone?: string };
}): HubSpotPropertyValues {
  const props: HubSpotPropertyValues = {
    email: args.email,
    // Workflow trigger — always refreshed on every submit
    gem_assessment_tool: args.current.assessment_key,
    gem_assessment_date: args.current.submitted_at.slice(0, 10),
    gem_assessment_score: args.current.score,
    gem_score_tier: args.current.tier,
  };

  if (args.contact?.first_name) props.firstname = args.contact.first_name;
  if (args.contact?.last_name)  props.lastname  = args.contact.last_name;
  if (args.contact?.company)    props.company   = args.contact.company;
  if (args.contact?.phone)      props.phone     = args.contact.phone;

  // Latest submission per assessment_key
  const latestByKey = new Map<string, SubmissionForMapping>();
  for (const s of args.history) {
    if (!latestByKey.has(s.assessment_key)) latestByKey.set(s.assessment_key, s);
  }

  for (const [key, sub] of latestByKey) {
    const spec = REGISTRY_BY_KEY[key];
    if (!spec) continue; // unknown assessment key; skip mapping
    Object.assign(props, spec.toContactProperties(sub));
  }

  // Rollup
  const distinctKeys = [...latestByKey.keys()];
  const scores = args.history.map(s => s.score).filter((n): n is number => typeof n === "number");
  const newest = args.history[0] ?? args.current;
  let highScore = -Infinity, highTool = "";
  let lowScore = Infinity;
  for (const s of args.history) {
    if (typeof s.score !== "number") continue;
    if (s.score > highScore) { highScore = s.score; highTool = s.assessment_key; }
    if (s.score < lowScore) lowScore = s.score;
  }

  props.gem_customer = true;
  props.gem_last_assessment = newest.assessment_key;
  props.gem_last_score = newest.score;
  props.gem_last_tier = newest.tier;
  props.gem_last_completed_at = newest.submitted_at.slice(0, 10);
  props.gem_assessments_count = distinctKeys.length;
  // HubSpot multi-checkbox wants semicolon-delimited option values
  props.gem_assessments_taken = distinctKeys.sort().join(";");
  if (scores.length) {
    props.gem_high_score = highScore;
    props.gem_low_score = lowScore;
    props.gem_high_score_tool = highTool;
  }

  return props;
}
