// The HubSpot retry runner, shared by the scheduled job and Admin "Retry now".
// Rebuilds properties from the stored submission with the current mapping;
// falls back to the cleaned stored payload only when that isn't possible.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { upsertContactByEmail, createLeadForContact, classifyLead } from "@/lib/hub/hubspot";
import { REGISTRY_BY_KEY } from "@/lib/hub/assessments";
import { rebuildForSubmission, cleanStoredProperties } from "@/lib/hub/submission-properties.server";

export type RetryResult = { processed: number; ok: number; dead: number; requeued: number; rebuilt: number };

export type RetryDeps = {
  svc: any;
  upsert: typeof upsertContactByEmail;
  createLead: typeof createLeadForContact;
  rebuild: (svc: any, submissionId: string) => ReturnType<typeof rebuildForSubmission>;
  now: () => number;
};

export function backoffMinutes(attempts: number): number {
  return Math.min(60 * 24, Math.pow(2, attempts)); // cap 1 day
}

export async function runHubspotRetry(deps?: Partial<RetryDeps>): Promise<RetryResult> {
  const d: RetryDeps = {
    svc: deps?.svc ?? createHubServiceClient(),
    upsert: deps?.upsert ?? upsertContactByEmail,
    createLead: deps?.createLead ?? createLeadForContact,
    rebuild: deps?.rebuild ?? rebuildForSubmission,
    now: deps?.now ?? Date.now,
  };
  const svc = d.svc;
  const { data: jobs } = await svc
    .from("retry_queue").select("*")
    .eq("status", "pending").eq("job_type", "hubspot_upsert")
    .lte("next_attempt_at", new Date(d.now()).toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(25);
  const res: RetryResult = { processed: jobs?.length ?? 0, ok: 0, dead: 0, requeued: 0, rebuilt: 0 };
  for (const j of jobs ?? []) {
    const stored = j.payload as { email: string; properties: Record<string, any> };
    try {
      let email = stored.email;
      let properties: Record<string, any> | null = null;
      if (j.submission_id) {
        try {
          const r = await d.rebuild(svc, j.submission_id);
          if (r) { email = r.email; properties = r.properties; res.rebuilt++; }
        } catch (e) { console.error("[retry] rebuild failed, using stored payload", e); }
      }
      if (!properties) properties = cleanStoredProperties(stored.properties as any);
      const assessmentKey = (properties.gem_assessment_tool as string) ?? (properties.gem_last_assessment as string) ?? "";
      const assessmentLabel = REGISTRY_BY_KEY[assessmentKey]?.displayName ?? (assessmentKey || "GEM.IQ");
      const { id: hsId, skipped } = await d.upsert(email, properties as any, { label: "GEM.IQ", detail: assessmentLabel });
      await svc.from("retry_queue").update({ status: "done", attempts: j.attempts + 1, last_error: null }).eq("id", j.id);
      if (j.submission_id) {
        await svc.from("submissions").update({
          hubspot_contact_id: hsId,
          hubspot_synced_at: new Date(d.now()).toISOString(),
          hubspot_sync_error: skipped?.length ? `skipped_props:${skipped.join(",")}` : null,
        }).eq("id", j.submission_id);
      }
      const score = typeof properties.gem_assessment_score === "number" ? properties.gem_assessment_score
        : typeof properties.gem_last_score === "number" ? properties.gem_last_score : null;
      const contactName = `${properties.firstname ?? ""} ${properties.lastname ?? ""}`.trim() || email;
      await d.createLead({ contactId: hsId, contactName, assessmentLabel, score, temperature: classifyLead(score) })
        .catch(e => console.error("[retry] createLead error", e));
      res.ok++;
    } catch (e: any) {
      const attempts = j.attempts + 1;
      if (attempts >= j.max_attempts) {
        await svc.from("retry_queue").update({ status: "dead", attempts, last_error: e.message }).eq("id", j.id);
        res.dead++;
      } else {
        await svc.from("retry_queue").update({
          attempts, last_error: e.message,
          next_attempt_at: new Date(d.now() + backoffMinutes(attempts) * 60_000).toISOString(),
        }).eq("id", j.id);
        res.requeued++;
      }
    }
  }
  return res;
}

export function formatRetryResult(r: RetryResult): string {
  if (!r.processed) return "Nothing was due to retry.";
  return `${r.ok} sent, ${r.requeued} re-queued, ${r.dead} failed permanently`;
}
