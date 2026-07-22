import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR, createHubServiceClient } from "@/lib/hub/supabase-server";
import { SubmissionPayloadSchema } from "@/lib/hub/schemas";
import { upsertContactByEmail, createLeadForContact, classifyLead } from "@/lib/hub/hubspot";
import { buildContactProperties, REGISTRY_BY_KEY } from "@/lib/hub/assessments";
import type { SubmissionForMapping } from "@/lib/hub/assessments/types";
import { json, corsHeaders } from "@/lib/hub/http";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const NOTIFY_RECIPIENTS = ["info@globaledgemarkets.com", "alexr@globaledgemarkets.com"];

async function sendSubmissionNotification(args: {
  submissionId: string;
  email: string;
  payload: any;
  hsContactId: string | null;
  hsLeadId: string | null;
  temperature: string | null;
  assessmentLabel: string;
  submittedAt: string;
}) {
  const { submissionId, email, payload, hsContactId, hsLeadId, temperature, assessmentLabel, submittedAt } = args;
  const fname = (payload.metadata?.first_name as string | undefined) ?? "";
  const lname = (payload.metadata?.last_name as string | undefined) ?? "";
  const contactName = `${fname} ${lname}`.trim() || email;
  const dims = payload.dimensions && typeof payload.dimensions === "object"
    ? Object.entries(payload.dimensions).map(([name, score]) => ({ name, score: score as any }))
    : [];
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const hubspotContactUrl = hsContactId && portalId ? `https://app.hubspot.com/contacts/${portalId}/contact/${hsContactId}` : null;
  const hubspotLeadUrl = hsLeadId && portalId ? `https://app.hubspot.com/contacts/${portalId}/record/0-136/${hsLeadId}` : null;
  const reportUrl = (payload.report_url as string | undefined) ?? (payload.metadata?.report_url as string | undefined) ?? (payload.metadata?.pdf_url as string | undefined) ?? null;

  const templateData = {
    assessmentLabel,
    assessmentKey: payload.assessment_key,
    contactName,
    email,
    company: payload.metadata?.company as string | undefined,
    phone: payload.metadata?.phone as string | undefined,
    score: payload.score ?? null,
    tier: payload.tier ?? null,
    temperature,
    dimensions: dims,
    reportUrl,
    submittedAt,
    hubspotContactUrl,
    hubspotLeadUrl,
  };

  await Promise.all(NOTIFY_RECIPIENTS.map((to) =>
    sendTemplateEmail("submission-notification", to, {
      templateData,
      idempotencyKey: `submission-notify-${submissionId}-${to}`,
    }).catch((e) => { console.error("[submit] notification email failed", to, e); return null; })
  ));
}

export const Route = createFileRoute("/api/public/submissions/submit")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const parsed = SubmissionPayloadSchema.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 }, request);
        const payload = parsed.data;

        // Optional user context (submissions are allowed anonymous)
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();

        const svc = createHubServiceClient();
        const email = payload.email.toLowerCase();

        // Trial enforcement: signed-in users on a `trialing` subscription get
        // `trial_assessment_limit` free submissions (default 1) across any IQ.
        // Once exhausted, block with 402 so the IQ can prompt to upgrade.
        // Anonymous submissions and non-trial subscriptions are unaffected here.
        let trialSubId: string | null = null;
        let trialUsedBefore = 0;
        if (user?.id) {
          const { data: sub } = await svc
            .from("subscriptions")
            .select("id,status,trial_assessments_used,trial_assessment_limit")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (sub && sub.status === "trialing") {
            const used = sub.trial_assessments_used ?? 0;
            const limit = sub.trial_assessment_limit ?? 1;
            if (used >= limit) {
              return json({
                error: "trial_limit_reached",
                trial_assessments_used: used,
                trial_assessment_limit: limit,
                message: "Your 7-day trial includes 1 free assessment. Upgrade to continue.",
              }, { status: 402 }, request);
            }
            trialSubId = sub.id;
            trialUsedBefore = used;
          }
        }

        // Dedupe: within last 10 minutes, same email+assessment → return existing
        const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
        const { data: dupe } = await svc
          .from("submissions")
          .select("id,hubspot_contact_id,hubspot_synced_at")
          .eq("email", email)
          .eq("assessment_key", payload.assessment_key)
          .gte("created_at", tenMinAgo)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (dupe) return json({ id: dupe.id, deduped: true, hubspot_contact_id: dupe.hubspot_contact_id }, undefined, request);

        // Persist. `detail` is folded into metadata alongside anything the IQ sent.
        const mergedMetadata = { ...(payload.metadata ?? {}), detail: payload.detail ?? {} };
        const { data: inserted, error: insErr } = await svc
          .from("submissions")
          .insert({
            user_id: user?.id ?? null,
            email,
            assessment_key: payload.assessment_key,
            score: payload.score ?? null,
            tier: payload.tier ?? null,
            dimensions: payload.dimensions ?? {},
            answers: payload.answers ?? null,
            metadata: mergedMetadata,
            submitted_at: payload.submitted_at ?? new Date().toISOString(),
          })
          .select("id,submitted_at")
          .single();
        if (insErr || !inserted) return json({ error: "db_insert_failed", detail: insErr?.message }, { status: 500 }, request);

        // Increment trial usage after a successful insert. Best-effort; a rare race
        // could allow a second concurrent submission — acceptable for a $99 trial.
        if (trialSubId) {
          await svc.from("subscriptions")
            .update({ trial_assessments_used: trialUsedBefore + 1 })
            .eq("id", trialSubId);
        }

        // Load full history for this email so HubSpot props reflect the whole profile.
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
          submitted_at: r.submitted_at,
        }));

        const current: SubmissionForMapping = {
          email,
          assessment_key: payload.assessment_key,
          score: payload.score ?? null,
          tier: payload.tier ?? null,
          dimensions: payload.dimensions ?? null,
          detail: payload.detail ?? null,
          submitted_at: inserted.submitted_at,
        };

        const props = buildContactProperties({
          email,
          history,
          current,
          contact: {
            first_name: (payload.metadata?.first_name as string | undefined),
            last_name:  (payload.metadata?.last_name  as string | undefined),
            company:    (payload.metadata?.company    as string | undefined),
            phone:      (payload.metadata?.phone      as string | undefined),
          },
        });

        const temperature = classifyLead(payload.score);
        const assessmentLabel = REGISTRY_BY_KEY[payload.assessment_key]?.displayName ?? payload.assessment_key;
        let hsContactId: string | null = null;
        let hsLeadId: string | null = null;
        let skippedProps: string[] = [];
        let queuedForRetry = false;

        try {
          const { id: hsId, skipped } = await upsertContactByEmail(email, props);
          hsContactId = hsId;
          skippedProps = skipped;
          await svc.from("submissions").update({
            hubspot_contact_id: hsId,
            hubspot_synced_at: new Date().toISOString(),
            hubspot_sync_error: skipped.length ? `skipped_props:${skipped.join(",")}` : null,
          }).eq("id", inserted.id);
          if (user?.id) await svc.from("profiles").update({ hubspot_contact_id: hsId }).eq("id", user.id);

          const fname = (payload.metadata?.first_name as string | undefined) ?? "";
          const lname = (payload.metadata?.last_name as string | undefined) ?? "";
          const contactName = `${fname} ${lname}`.trim() || email;
          const lead = await createLeadForContact({
            contactId: hsId, contactName, assessmentLabel,
            score: payload.score ?? null, temperature,
          }).catch(e => { console.error("[submit] createLead error", e); return null; });
          hsLeadId = lead?.id ?? null;
        } catch (e: any) {
          console.error("[submit] hubspot upsert failed", e);
          await svc.from("submissions").update({ hubspot_sync_error: e.message }).eq("id", inserted.id);
          await svc.from("retry_queue").insert({
            job_type: "hubspot_upsert",
            submission_id: inserted.id,
            payload: { email, properties: props },
          });
          queuedForRetry = true;
        }

        // Always send the internal notification, regardless of HubSpot outcome.
        await sendSubmissionNotification({
          submissionId: inserted.id,
          email,
          payload,
          hsContactId,
          hsLeadId,
          temperature,
          assessmentLabel,
          submittedAt: inserted.submitted_at,
        }).catch(e => console.error("[submit] notification wrapper failed", e));

        return json({
          id: inserted.id,
          hubspot_contact_id: hsContactId,
          hubspot_lead_id: hsLeadId,
          lead_temperature: temperature,
          skipped_properties: skippedProps,
          queued_for_retry: queuedForRetry,
        }, queuedForRetry ? { status: 202 } : undefined, request);

      },
    },
  },
});
