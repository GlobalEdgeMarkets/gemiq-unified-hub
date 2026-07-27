// Read-only status, pre-flight checks and submission browsing for the admin console.
import { REGISTRY } from "@/lib/hub/assessments";
import manifest from "@/lib/hub/manifest.json";
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { readContactProperty, CANONICAL_TIERS } from "./hubspot-bootstrap.server";

/** IQ keys the ReadinessIQ migration will split into. Specs land in a later prompt. */
export const EXPECTED_MIGRATION_KEYS = ["gtmiq", "salesiq", "productiq", "aitransformiq"] as const;

/** Placeholder-spec detection: a real spec declares more than three properties. */
const PLACEHOLDER_PROPERTY_COUNT = 3;

export function getRegistryStatus() {
  return {
    manifest_version: (manifest as { version?: string }).version ?? "unknown",
    manifest_updated_at: (manifest as { updated_at?: string }).updated_at ?? null,
    registry: REGISTRY.map(s => ({
      key: s.key,
      display_name: s.displayName,
      contact_properties: s.contactProperties.length,
    })),
  };
}

export type PreflightCheck = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export async function runPreflight(): Promise<{ checks: PreflightCheck[]; all_pass: boolean }> {
  const checks: PreflightCheck[] = [];
  const byKey = new Map(REGISTRY.map(s => [s.key, s]));

  // 1. All four new keys present in REGISTRY
  const missingKeys = EXPECTED_MIGRATION_KEYS.filter(k => !byKey.has(k));
  checks.push({
    id: "registry_keys",
    label: "All four new IQ keys present in REGISTRY",
    pass: missingKeys.length === 0,
    detail: missingKeys.length
      ? `Missing: ${missingKeys.join(", ")}`
      : `Present: ${EXPECTED_MIGRATION_KEYS.join(", ")}`,
  });

  // 2. Each of the four declares more than the placeholder properties
  const thin = EXPECTED_MIGRATION_KEYS
    .map(k => ({ k, n: byKey.get(k)?.contactProperties.length ?? 0 }))
    .filter(x => x.n <= PLACEHOLDER_PROPERTY_COUNT);
  checks.push({
    id: "registry_properties",
    label: `Each new spec declares more than ${PLACEHOLDER_PROPERTY_COUNT} properties`,
    pass: missingKeys.length === 0 && thin.length === 0,
    detail: missingKeys.length
      ? "Blocked — specs not registered yet"
      : thin.length
        ? `Still placeholder: ${thin.map(x => `${x.k} (${x.n})`).join(", ")}`
        : "All four specs carry real dimension properties",
  });

  // 3. gem_assessments_taken must be a multiple-checkbox property in HubSpot.
  //    Read the live definition — never assume.
  const taken = await readContactProperty("gem_assessments_taken");
  if (!taken.ok) {
    checks.push({
      id: "assessments_taken_type",
      label: "gem_assessments_taken is a multiple-checkbox property",
      pass: false,
      detail: `Could not read property from HubSpot [${taken.status}]: ${taken.error.slice(0, 300)}`,
    });
  } else {
    const p = taken.property;
    const isMultiCheckbox = p.type === "enumeration" && p.fieldType === "checkbox";
    checks.push({
      id: "assessments_taken_type",
      label: "gem_assessments_taken is a multiple-checkbox property",
      pass: isMultiCheckbox,
      detail: `HubSpot reports type="${p.type}", fieldType="${p.fieldType}"${
        isMultiCheckbox ? "" : " — single-select silently corrupts multi-IQ contacts"
      }`,
    });
  }

  // 4. gem_score_tier enum contains all five canonical values
  const tier = await readContactProperty("gem_score_tier");
  if (!tier.ok) {
    checks.push({
      id: "score_tier_options",
      label: "gem_score_tier contains all five canonical tiers",
      pass: false,
      detail: `Could not read property from HubSpot [${tier.status}]: ${tier.error.slice(0, 300)}`,
    });
  } else {
    const values = new Set((tier.property.options ?? []).map(o => o.value));
    const missingTiers = CANONICAL_TIERS.filter(t => !values.has(t));
    checks.push({
      id: "score_tier_options",
      label: "gem_score_tier contains all five canonical tiers",
      pass: missingTiers.length === 0,
      detail: missingTiers.length
        ? `Missing: ${missingTiers.join(", ")}`
        : `Present: ${CANONICAL_TIERS.join(", ")}`,
    });
  }

  return { checks, all_pass: checks.every(c => c.pass) };
}

export type SubmissionRow = {
  id: string;
  email: string;
  assessment_key: string;
  score: number | null;
  tier: string | null;
  submitted_at: string;
  hubspot_contact_id: string | null;
  hubspot_synced_at: string | null;
  hubspot_sync_error: string | null;
};

export async function listSubmissions(filter: {
  email?: string;
  assessment_key?: string;
  limit?: number;
}): Promise<{ rows: SubmissionRow[]; count: number | null }> {
  const svc = createHubServiceClient();
  let q = svc
    .from("submissions")
    .select(
      "id,email,assessment_key,score,tier,submitted_at,hubspot_contact_id,hubspot_synced_at,hubspot_sync_error",
      { count: "exact" },
    )
    .order("submitted_at", { ascending: false })
    .limit(Math.min(filter.limit ?? 50, 200));

  if (filter.email) q = q.ilike("email", `%${filter.email.trim()}%`);
  if (filter.assessment_key) q = q.eq("assessment_key", filter.assessment_key);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as SubmissionRow[], count: count ?? null };
}
