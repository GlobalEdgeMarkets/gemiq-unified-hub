// Shared implementation of the legacy-submission import.
// Extracted from src/routes/api/public/admin/import-legacy-submissions.ts so the
// ReadinessIQ migration feeds through the EXACT same insert + registry-driven
// HubSpot upsert path as the job-secret route. Behaviour unchanged.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { upsertContactByEmail } from "@/lib/hub/hubspot";
import { buildContactProperties } from "@/lib/hub/assessments";
import type { SubmissionForMapping } from "@/lib/hub/assessments/types";
import type { SubmissionPayload } from "@/lib/hub/schemas";

export type ImportRowResult = {
  email: string;
  assessment_key: string;
  status: "inserted" | "duplicate" | "insert_error";
  detail?: string;
};
export type ImportHubspotResult = {
  email: string;
  status: "ok" | "error";
  detail?: string;
  skipped?: string[];
};
export type ImportLegacySubmissionsResult = {
  processed: number;
  results: ImportRowResult[];
  hubspot: ImportHubspotResult[] | "skipped";
};

export async function runImportLegacySubmissions(input: {
  submissions: SubmissionPayload[];
  skip_hubspot?: boolean;
}): Promise<ImportLegacySubmissionsResult> {
  const svc = createHubServiceClient();
  const results: ImportRowResult[] = [];
  const touchedEmails = new Set<string>();

  for (const s of input.submissions) {
    const email = s.email.toLowerCase();
    const submitted_at = s.submitted_at ?? new Date().toISOString();
    // Idempotency: skip if the same (email, key, submitted_at) is already stored.
    const { data: existing } = await svc
      .from("submissions").select("id")
      .eq("email", email).eq("assessment_key", s.assessment_key).eq("submitted_at", submitted_at)
      .maybeSingle();
    if (existing) { results.push({ email, assessment_key: s.assessment_key, status: "duplicate" }); continue; }

    const mergedMetadata = {
      ...(s.metadata ?? {}),
      detail: s.detail ?? {},
      backfill: true,
      ...(s.report_url ? { report_url: s.report_url } : {}),
    };
    const { error } = await svc.from("submissions").insert({
      email,
      assessment_key: s.assessment_key,
      score: s.score ?? null,
      tier: s.tier ?? null,
      dimensions: s.dimensions ?? {},
      answers: s.answers ?? null,
      metadata: mergedMetadata,
      submitted_at,
    });
    if (error) { results.push({ email, assessment_key: s.assessment_key, status: "insert_error", detail: error.message }); continue; }
    touchedEmails.add(email);
    results.push({ email, assessment_key: s.assessment_key, status: "inserted" });
  }

  if (input.skip_hubspot) return { processed: results.length, results, hubspot: "skipped" };

  // Rebuild the HubSpot contact once per touched email using full history.
  const hs: ImportHubspotResult[] = [];
  for (const email of touchedEmails) {
    const { data: rows } = await svc
      .from("submissions")
      .select("assessment_key,score,tier,dimensions,metadata,submitted_at")
      .eq("email", email)
      .order("submitted_at", { ascending: false });
    if (!rows?.length) continue;
    const history: SubmissionForMapping[] = rows.map(r => ({
      email,
      assessment_key: r.assessment_key,
      score: (r.score as number | null) ?? null,
      tier: r.tier ?? null,
      dimensions: (r.dimensions as Record<string, unknown> | null) ?? null,
      detail: ((r.metadata as Record<string, unknown> | null)?.detail as Record<string, unknown> | null) ?? null,
      submitted_at: r.submitted_at,
    }));
    const current = history[0];
    const props = buildContactProperties({ email, history, current });
    try {
      const { id, skipped } = await upsertContactByEmail(email, props);
      hs.push({ email, status: "ok", skipped });
      await svc.from("submissions").update({
        hubspot_contact_id: id, hubspot_synced_at: new Date().toISOString(),
      }).eq("email", email).is("hubspot_contact_id", null);
    } catch (e) {
      hs.push({ email, status: "error", detail: e instanceof Error ? e.message : String(e) });
    }
  }
  return { processed: results.length, results, hubspot: hs };
}
