// "Reset all reports": erase every assessment result everywhere while keeping
// accounts and plans. Runs in small batches so each call stays short:
//   per person → each IQ app's purge-user link + clear gem_* fields on the HubSpot contact
//   final step → delete Hub results + retry jobs, reset trial usage.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { collectAllPropertyDefs } from "@/lib/hub/assessments";

const BATCH = 4;
const ROLLUP_PROPS = [
  "gem_assessment_tool", "gem_assessment_date", "gem_assessment_score", "gem_score_tier",
  "gem_customer", "gem_last_assessment", "gem_last_score", "gem_last_tier", "gem_last_completed_at",
  "gem_assessments_count", "gem_assessments_taken", "gem_composite_score", "gem_composite_tier", "gem_next_assessment", "gem_high_score", "gem_low_score", "gem_high_score_tool",
  "gem_assessment_submitted_at", "gem_assessment_label", "gem_submission_id", "gem_report_url", "gem_report_locked", "gem_entitlement",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createHubServiceClient();
}

/** Everyone who may hold results: anyone with a Hub result or a Hub profile. */
async function allEmails(): Promise<string[]> {
  const [subs, profs] = await Promise.all([
    db().from("submissions").select("email").limit(10000),
    db().from("profiles").select("email").limit(10000),
  ]);
  const set = new Set<string>();
  for (const r of [...(subs.data ?? []), ...(profs.data ?? [])] as { email: string | null }[]) {
    if (r.email) set.add(r.email.trim().toLowerCase());
  }
  return [...set].sort();
}

export async function resetPreview() {
  const emails = await allEmails();
  const { count } = await db().from("submissions").select("id", { count: "exact", head: true });
  return { people: emails.length, results: count ?? 0 };
}

async function clearHubspot(email: string): Promise<string> {
  const { hsBase, hsAuthHeaders } = await import("@/lib/hub/hubspot-transport");
  const base = hsBase();
  const headers = hsAuthHeaders();
  let names = [...new Set([...collectAllPropertyDefs().map((p) => p.name), ...ROLLUP_PROPS])];
  for (let attempt = 0; attempt < 3; attempt++) {
    const properties = Object.fromEntries(names.map((n) => [n, ""]));
    const res = await fetch(`${base}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ properties }),
    });
    if (res.status === 404) return "no contact";
    if (res.ok) return "cleared";
    const body = await res.text();
    // Drop properties this portal doesn't have, then retry.
    const unknown = [...body.matchAll(/Property \\?"([a-z0-9_]+)\\?" does not exist/gi)].map((m) => m[1]);
    if (res.status === 400 && unknown.length) {
      names = names.filter((n) => !unknown.includes(n));
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 160)}`);
  }
  throw new Error("could not clear fields");
}

export type ResetStep = { email: string; failures: string[] };

export async function resetBatch(offset: number) {
  const emails = await allEmails();
  const slice = emails.slice(offset, offset + BATCH);
  const secret = process.env.HUB_PURGE_SECRET;
  const { purgeTargets } = await import("@/lib/hub/app-control.server");
  const targets = await purgeTargets();

  const steps: ResetStep[] = await Promise.all(
    slice.map(async (email) => {
      const failures: string[] = [];
      await Promise.all(
        targets.map(async (t) => {
          if (!secret) { failures.push(`${t.key}: delete secret missing`); return; }
          try {
            const r = await fetch(t.url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-hub-purge-secret": secret },
              body: JSON.stringify({ email }),
            });
            if (!r.ok) failures.push(`${t.key}: HTTP ${r.status}`);
          } catch (e) {
            failures.push(`${t.key}: ${e instanceof Error ? e.message : "unreachable"}`);
          }
        }),
      );
      try { await clearHubspot(email); }
      catch (e) { failures.push(`HubSpot: ${e instanceof Error ? e.message : String(e)}`); }
      return { email, failures };
    }),
  );

  const next = offset + slice.length;
  return { total: emails.length, next, done: next >= emails.length, steps };
}

/** Final step: wipe Hub-side results. Accounts, profiles and plans stay. */
export async function resetFinish(by: string) {
  const out: string[] = [];
  const q = await db().from("retry_queue").delete().not("id", "is", null);
  if (q.error) out.push(`retry jobs: ${q.error.message}`);
  const s = await db().from("submissions").delete({ count: "exact" }).not("id", "is", null);
  if (s.error) throw new Error(`Could not delete results: ${s.error.message}`);
  const t = await db().from("subscriptions").update({ trial_assessments_used: 0 }).gt("trial_assessments_used", 0);
  if (t.error) out.push(`trial reset: ${t.error.message}`);
  console.log(`[reset-reports] ${s.count ?? 0} results erased by ${by}`);
  return { results_deleted: s.count ?? 0, warnings: out };
}
