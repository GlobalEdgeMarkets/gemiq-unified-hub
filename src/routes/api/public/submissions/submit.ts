import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR, createHubServiceClient } from "@/lib/hub/supabase-server";
import { SubmissionPayloadSchema } from "@/lib/hub/schemas";
import { buildGemProperties, upsertContactByEmail } from "@/lib/hub/hubspot";
import { json, corsHeaders } from "@/lib/hub/http";

export const Route = createFileRoute("/api/public/submissions/submit")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const parsed = SubmissionPayloadSchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 });
        const payload = parsed.data;

        // Optional user context (submissions are allowed anonymous)
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();

        const svc = createHubServiceClient();

        // Dedupe: within last 10 minutes, same email+assessment → return existing
        const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
        const { data: dupe } = await svc
          .from("submissions")
          .select("id,hubspot_contact_id,hubspot_synced_at")
          .eq("email", payload.email.toLowerCase())
          .eq("assessment_key", payload.assessment_key)
          .gte("created_at", tenMinAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dupe) return json({ id: dupe.id, deduped: true, hubspot_contact_id: dupe.hubspot_contact_id });

        const { data: inserted, error: insErr } = await svc
          .from("submissions")
          .insert({
            user_id: user?.id ?? null,
            email: payload.email.toLowerCase(),
            assessment_key: payload.assessment_key,
            score: payload.score ?? null,
            tier: payload.tier ?? null,
            dimensions: payload.dimensions ?? {},
            answers: payload.answers ?? null,
            metadata: payload.metadata ?? null,
            submitted_at: payload.submitted_at ?? new Date().toISOString(),
          })
          .select("id,submitted_at")
          .single();
        if (insErr || !inserted) return json({ error: "db_insert_failed", detail: insErr?.message }, { status: 500 });

        // HubSpot upsert (best-effort; failure → retry_queue)
        const props = buildGemProperties({
          email: payload.email,
          assessment_key: payload.assessment_key,
          score: payload.score,
          tier: payload.tier,
          dimensions: payload.dimensions,
          submitted_at: inserted.submitted_at,
          metadata: payload.metadata,
        });

        try {
          const { id: hsId, skipped } = await upsertContactByEmail(payload.email, props);
          await svc.from("submissions").update({
            hubspot_contact_id: hsId,
            hubspot_synced_at: new Date().toISOString(),
            hubspot_sync_error: skipped.length ? `skipped_props:${skipped.join(",")}` : null,
          }).eq("id", inserted.id);
          if (user?.id) await svc.from("profiles").update({ hubspot_contact_id: hsId }).eq("id", user.id);
          return json({ id: inserted.id, hubspot_contact_id: hsId, skipped_properties: skipped });
        } catch (e: any) {
          await svc.from("submissions").update({ hubspot_sync_error: e.message }).eq("id", inserted.id);
          await svc.from("retry_queue").insert({
            job_type: "hubspot_upsert",
            submission_id: inserted.id,
            payload: { email: payload.email, properties: props },
          });
          return json({ id: inserted.id, queued_for_retry: true }, { status: 202 });
        }
      },
    },
  },
});
