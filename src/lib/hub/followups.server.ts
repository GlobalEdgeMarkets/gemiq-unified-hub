// Score-based follow-up emails: rules (global + per-assessment), queueing on submit,
// sending due emails (called by the 5-minute job), unsubscribe and admin log.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import {
  FOLLOWUP_STEPS, bodyFor, fill, mergeRules,
  type FollowupOverride, type FollowupRules, type FollowupStepKey,
} from "@/lib/followups";

const HUB = "https://gemiq.globaledgemarkets.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createHubServiceClient();
}

export async function getAllRules(): Promise<{ global: FollowupRules; overrides: Record<string, FollowupOverride> }> {
  const { data } = await db().from("hub_followup_rules").select("scope,rules");
  const rows = (data ?? []) as { scope: string; rules: FollowupOverride }[];
  const globalRow = rows.find((r) => r.scope === "global")?.rules ?? {};
  const overrides: Record<string, FollowupOverride> = {};
  for (const r of rows) if (r.scope !== "global") overrides[r.scope] = r.rules ?? {};
  return { global: mergeRules(globalRow), overrides };
}

export async function rulesFor(key: string): Promise<FollowupRules> {
  const { global, overrides } = await getAllRules();
  return mergeRules(global, overrides[key]);
}

export async function saveRules(scope: string, rules: FollowupOverride | null, by: string) {
  if (rules === null && scope !== "global") {
    const { error } = await db().from("hub_followup_rules").delete().eq("scope", scope);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await db().from("hub_followup_rules").upsert({
    scope, rules: rules ?? {}, updated_by: by, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Queue the follow-ups for a fresh result. Never throws — a submit must not fail on this. */
export async function enqueueFollowups(sub: {
  id: string; email: string; assessment_key: string; entitlement: string; submitted_at: string;
}) {
  try {
    const rules = await rulesFor(sub.assessment_key);
    const base = new Date(sub.submitted_at).getTime() || Date.now();
    const rows = FOLLOWUP_STEPS
      .filter((k) => rules[k].enabled)
      .filter((k) => k !== "unlock" || sub.entitlement === "trial" || sub.entitlement === "none")
      .map((k) => ({
        submission_id: sub.id,
        email: sub.email.toLowerCase(),
        assessment_key: sub.assessment_key,
        step: k,
        send_at: new Date(base + rules[k].delay_days * 86_400_000).toISOString(),
      }));
    // A newer result for the same assessment replaces older pending retake reminders.
    await db().from("hub_followup_queue").update({ status: "skipped", error: "replaced by newer result" })
      .eq("status", "pending").eq("step", "retake").eq("assessment_key", sub.assessment_key).eq("email", sub.email.toLowerCase());
    if (rows.length) await db().from("hub_followup_queue").upsert(rows, { onConflict: "submission_id,step", ignoreDuplicates: true });
  } catch (e) {
    console.error("[followups] enqueue failed", e);
  }
}

async function hmac(text: string): Promise<string> {
  const secret = process.env.JOB_SECRET;
  if (!secret) throw new Error("JOB_SECRET not set");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`unsub:${text}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function unsubscribeUrl(email: string) {
  return `${HUB}/unsubscribe?e=${encodeURIComponent(email)}&t=${await hmac(email.toLowerCase())}`;
}

export async function unsubscribe(email: string, token: string) {
  const e = email.trim().toLowerCase();
  if ((await hmac(e)) !== token) throw new Error("This unsubscribe link isn't valid.");
  await db().from("email_unsubscribes").upsert({ email: e });
  await db().from("hub_followup_queue").update({ status: "skipped", error: "unsubscribed" }).eq("email", e).eq("status", "pending");
  return { ok: true };
}

function iqName(key: string) {
  const names: Record<string, string> = { gtmiq: "GTMIQ", salesiq: "SalesIQ", productiq: "ProductIQ", aitransformiq: "AITransformIQ", uxiq: "UXIQ", tariffiq: "TariffIQ" };
  return names[key] ?? key;
}

/** Send everything that is due. Returns counts; safe to call often. */
export async function processDueFollowups(limit = 25) {
  const { data: due } = await db().from("hub_followup_queue").select("*")
    .eq("status", "pending").lte("send_at", new Date().toISOString())
    .order("send_at", { ascending: true }).limit(limit);
  if (!due?.length) return { sent: 0, skipped: 0, failed: 0 };
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const { listApps } = await import("@/lib/hub/app-control.server");
  const apps = await listApps().catch(() => []);
  let sent = 0, skipped = 0, failed = 0;

  for (const q of due as { id: string; submission_id: string; email: string; assessment_key: string; step: FollowupStepKey }[]) {
    const mark = (status: string, error?: string) =>
      db().from("hub_followup_queue").update({ status, error: error ?? null, sent_at: status === "sent" ? new Date().toISOString() : null }).eq("id", q.id);
    try {
      const { data: unsub } = await db().from("email_unsubscribes").select("email").eq("email", q.email).maybeSingle();
      if (unsub) { await mark("skipped", "unsubscribed"); skipped++; continue; }
      const { data: s } = await db().from("submissions")
        .select("id,user_id,score,tier,metadata,report_hidden,report_unlocked_override").eq("id", q.submission_id).maybeSingle();
      if (!s || s.report_hidden) { await mark("skipped", "result removed or hidden"); skipped++; continue; }

      if (q.step === "unlock") {
        let paid = s.report_unlocked_override === true || s.metadata?.entitlement === "subscription" || s.metadata?.entitlement === "single_credit";
        if (!paid && s.user_id) {
          const { data: subs } = await db().from("subscriptions").select("status").eq("user_id", s.user_id).eq("status", "active").limit(1);
          paid = !!subs?.length;
        }
        if (paid) { await mark("skipped", "already has full access"); skipped++; continue; }
      }

      const rules = await rulesFor(q.assessment_key);
      const step = rules[q.step];
      if (!step.enabled) { await mark("skipped", "email turned off"); skipped++; continue; }
      const name = (s.metadata?.first_name as string | undefined) ?? null;
      const vars = { name, assessment: iqName(q.assessment_key), score: s.score, tier: s.tier };
      const site = apps.find((a) => a.key === q.assessment_key)?.site_url ?? `${HUB}/${q.assessment_key}`;
      const buttonUrl = q.step === "unlock" ? `${HUB}/dashboard?upgrade=1` : q.step === "retake" ? site : `${HUB}/report/${s.id}`;

      const res = await sendTemplateEmail("followup", q.email, {
        idempotencyKey: `followup-${q.id}`,
        templateData: {
          subject: fill(step.subject, vars),
          heading: fill(step.heading, vars),
          body: fill(bodyFor(step, s.score), vars),
          buttonLabel: fill(step.button_label, vars),
          buttonUrl,
          unsubscribeUrl: await unsubscribeUrl(q.email),
        },
      });
      if (res.sent) { await mark("sent"); sent++; } else { await mark("skipped", "address suppressed"); skipped++; }
    } catch (e) {
      await mark("failed", e instanceof Error ? e.message.slice(0, 300) : String(e));
      failed++;
    }
  }
  return { sent, skipped, failed };
}

export async function followupLog(limit = 100) {
  const { data } = await db().from("hub_followup_queue")
    .select("id,email,assessment_key,step,send_at,status,sent_at,error")
    .order("send_at", { ascending: false }).limit(limit);
  const { count: pending } = await db().from("hub_followup_queue").select("id", { count: "exact", head: true }).eq("status", "pending");
  const { count: sentCount } = await db().from("hub_followup_queue").select("id", { count: "exact", head: true }).eq("status", "sent");
  const { count: unsubs } = await db().from("email_unsubscribes").select("email", { count: "exact", head: true });
  return { items: data ?? [], stats: { pending: pending ?? 0, sent: sentCount ?? 0, unsubscribed: unsubs ?? 0 } };
}

/** Admin test: render a step with sample values and send it to the admin. */
export async function sendTest(key: string, stepKey: FollowupStepKey, to: string) {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const step = (await rulesFor(key))[stepKey];
  const vars = { name: "Alex", assessment: iqName(key), score: 58, tier: "Developing" };
  await sendTemplateEmail("followup", to, {
    templateData: {
      subject: `[Test] ${fill(step.subject, vars)}`,
      heading: fill(step.heading, vars),
      body: fill(bodyFor(step, 58), vars),
      buttonLabel: fill(step.button_label, vars),
      buttonUrl: `${HUB}/dashboard`,
      unsubscribeUrl: await unsubscribeUrl(to),
    },
  });
  return { ok: true };
}
