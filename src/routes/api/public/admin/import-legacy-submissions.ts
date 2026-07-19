// Admin: backfill legacy IQ submissions into the Hub.
// Accepts an array of submissions; each is inserted (unless a matching row
// already exists for that email+assessment+submitted_at) and pushed through
// the same registry-driven HubSpot upsert as live traffic.
// Auth: x-job-secret header must match JOB_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";
import { upsertContactByEmail } from "@/lib/hub/hubspot";
import { buildContactProperties } from "@/lib/hub/assessments";
import type { SubmissionForMapping } from "@/lib/hub/assessments/types";
import { SubmissionPayloadSchema } from "@/lib/hub/schemas";
import { z } from "zod";

const Body = z.object({
  /** Set true to skip the HubSpot write (DB-only backfill). */
  skip_hubspot: z.boolean().default(false),
  submissions: z.array(SubmissionPayloadSchema).max(500),
});

export const Route = createFileRoute("/api/public/admin/import-legacy-submissions")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        if (request.headers.get("x-job-secret") !== process.env.JOB_SECRET)
          return new Response("forbidden", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 }, request);

        const svc = createHubServiceClient();
        const results: Array<{ email: string; assessment_key: string; status: string; detail?: string }> = [];
        const touchedEmails = new Set<string>();

        for (const s of parsed.data.submissions) {
          const email = s.email.toLowerCase();
          const submitted_at = s.submitted_at ?? new Date().toISOString();
          // Idempotency: skip if the same (email, key, submitted_at) is already stored.
          const { data: existing } = await svc
            .from("submissions").select("id")
            .eq("email", email).eq("assessment_key", s.assessment_key).eq("submitted_at", submitted_at)
            .maybeSingle();
          if (existing) { results.push({ email, assessment_key: s.assessment_key, status: "duplicate" }); continue; }

          const mergedMetadata = { ...(s.metadata ?? {}), detail: s.detail ?? {}, backfill: true };
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

        if (parsed.data.skip_hubspot) return json({ processed: results.length, hubspot: "skipped", results }, undefined, request);

        // Rebuild HubSpot contact once per touched email using full history.
        const hs: Array<{ email: string; status: string; detail?: string; skipped?: string[] }> = [];
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
            detail: ((r.metadata as any)?.detail as Record<string, unknown> | null) ?? null,
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
          } catch (e: any) {
            hs.push({ email, status: "error", detail: e.message });
          }
        }
        return json({ processed: results.length, results, hubspot: hs }, undefined, request);
      },
    },
  },
});
