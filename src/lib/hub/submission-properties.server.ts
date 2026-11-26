// One place that turns a stored submission into the HubSpot property map.
// Used by live submits and by the retry job, so both always send the current mapping.
import { buildContactProperties, dropEmpty, gateLinks } from "@/lib/hub/assessments";
import type { SubmissionForMapping } from "@/lib/hub/assessments/types";
import type { createHubServiceClient } from "@/lib/hub/supabase-server";

type Svc = ReturnType<typeof createHubServiceClient>;
type Props = ReturnType<typeof buildContactProperties>;

export async function buildSubmissionProperties(svc: Svc, args: {
  email: string;
  current: SubmissionForMapping;
  contact?: { first_name?: string; last_name?: string; company?: string; phone?: string };
  workflow: { submission_id: string; report_url: string; report_locked: boolean; entitlement: string };
}): Promise<Props> {
  const { email } = args;
  const { data: historyRows } = await svc
    .from("submissions")
    .select("assessment_key,score,tier,dimensions,metadata,submitted_at")
    .eq("email", email)
    .order("submitted_at", { ascending: false });
  const history: SubmissionForMapping[] = (historyRows ?? []).map(r => ({
    email,
    assessment_key: r.assessment_key,
    score: (r.score as number | null) ?? null,
    tier: r.tier ?? null,
    dimensions: (r.dimensions as Record<string, unknown> | null) ?? null,
    detail: ((r.metadata as any)?.detail as Record<string, unknown> | null) ?? null,
    metadata: (r.metadata as Record<string, unknown> | null) ?? null,
    submitted_at: r.submitted_at,
  }));

  let composite: { score: number | null; tier: string | null; next: string | null } | undefined;
  try {
    const { computeComposite } = await import("@/lib/composite");
    const { getCompositeConfig } = await import("@/lib/hub/composite.server");
    const { LIVE_REGISTRY } = await import("@/lib/hub/assessments");
    const seen = new Set<string>();
    const latest = history.filter((h) => !seen.has(h.assessment_key) && seen.add(h.assessment_key));
    const c = computeComposite(latest, LIVE_REGISTRY.map((x) => x.key), (await getCompositeConfig()).settings);
    composite = { score: c.score, tier: c.tier, next: c.next };
  } catch (e) { console.error("[props] composite failed", e); }

  return buildContactProperties({
    composite, email, history, current: args.current,
    ...(args.contact ? { contact: args.contact } : {}),
    workflow: args.workflow,
  });
}

/** Rebuild properties for a stored submission (retry path). Null if the submission is gone. */
export async function rebuildForSubmission(svc: Svc, submissionId: string): Promise<{ email: string; properties: Props; assessmentKey: string } | null> {
  const { data: row } = await svc.from("submissions")
    .select("id,email,user_id,assessment_key,score,tier,dimensions,metadata,submitted_at,report_unlocked_override")
    .eq("id", submissionId).maybeSingle();
  if (!row) return null;
  const meta = (row.metadata as Record<string, any> | null) ?? {};
  let planActive = false;
  if (row.user_id) {
    const { selectCurrentSubscription } = await import("@/lib/hub/supabase-server");
    const { data: sub } = await selectCurrentSubscription<{ status: string }>(svc, row.user_id, "status");
    planActive = sub?.status === "active";
  }
  const { isReportLocked } = await import("@/lib/report-settings");
  const current: SubmissionForMapping = {
    email: row.email,
    assessment_key: row.assessment_key,
    score: (row.score as number | null) ?? null,
    tier: row.tier ?? null,
    dimensions: (row.dimensions as Record<string, unknown> | null) ?? null,
    detail: (meta.detail as Record<string, unknown> | null) ?? null,
    submitted_at: row.submitted_at,
    metadata: meta,
  };
  const properties = await buildSubmissionProperties(svc, {
    email: row.email,
    current,
    contact: { first_name: meta.first_name, last_name: meta.last_name, company: meta.company, phone: meta.phone },
    workflow: {
      submission_id: row.id,
      report_url: `https://gemiq.globaledgemarkets.com/report/${row.id}`,
      report_locked: isReportLocked({ report_unlocked_override: (row as any).report_unlocked_override ?? null, metadata: meta }, planActive),
      entitlement: String(meta.entitlement ?? "none"),
    },
  });
  return { email: row.email, properties, assessmentKey: row.assessment_key };
}

/** Fallback for a stored payload: drop empty values, and drop report links when trial/locked. */
export function cleanStoredProperties(p: Props): Props {
  const cleaned = dropEmpty(p);
  const locked = cleaned.gem_report_locked === true || cleaned.gem_report_locked === "true";
  const trial = cleaned.gem_entitlement === "trial";
  const gated = gateLinks(cleaned, { metadata: { entitlement: trial ? "trial" : undefined } } as unknown as SubmissionForMapping, locked);
  if (locked || trial) delete gated.gem_report_url;
  return gated;
}
