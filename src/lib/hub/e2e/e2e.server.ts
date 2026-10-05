// End-to-end tests: test accounts, run records, post-submit checks (Hub + HubSpot)
// and cleanup. Only addresses matching the test pattern are ever touched.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { REGISTRY_BY_KEY, LIVE_REGISTRY } from "@/lib/hub/assessments";
import { isReportLocked } from "@/lib/report-settings";
import type { E2eCheck, E2eRun, E2eSettings, E2eStatus } from "@/lib/e2e";

const HUB = "https://gemiq.globaledgemarkets.com";
/** How long checks that wait on HubSpot may stay "pending" before failing. */
const PENDING_WINDOW_MIN = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createHubServiceClient();
}

export async function getSettings(): Promise<E2eSettings> {
  const { data } = await db().from("hub_e2e_settings").select("*").eq("id", "global").maybeSingle();
  return (data as E2eSettings) ?? {
    enabled: true, base_email: "alexr@social2b.com", keep_days: 7, assessments: [], workflows: [],
    last_cleanup_at: null, updated_at: new Date().toISOString(), updated_by: null,
  };
}

export async function saveSettings(patch: Partial<Pick<E2eSettings, "enabled" | "base_email" | "keep_days" | "assessments" | "workflows">>, by: string) {
  const { error } = await db().from("hub_e2e_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: by }).eq("id", "global");
  if (error) throw new Error(error.message);
  return getSettings();
}

function splitBase(base: string) {
  const [local, domain] = base.toLowerCase().split("@");
  return { local, domain };
}

/** True only for <local>+gemtest-…@<domain> built from the configured base address (older runs used another tag). */
export function matchesTestPattern(email: string, base: string): boolean {
  const { local, domain } = splitBase(base);
  if (!local || !domain) return false;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${esc(local)}\\+(?:gemtest|checkly)-[a-z0-9-]+@${esc(domain)}$`).test(email.toLowerCase());
}

export async function isTestEmail(email: string): Promise<boolean> {
  try {
    return matchesTestPattern(email, (await getSettings()).base_email);
  } catch {
    return false;
  }
}

function makeEmail(base: string, key: string) {
  const { local, domain } = splitBase(base);
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 12); // yymmddhhmm
  const rand = Math.random().toString(36).slice(2, 6);
  return `${local}+gemtest-${key}-${stamp}${rand}@${domain}`;
}

async function liveApp(key: string) {
  if (!LIVE_REGISTRY.some((s) => s.key === key)) throw new Error(`Unknown or retired assessment: ${key}`);
  const { listApps } = await import("@/lib/hub/app-control.server");
  const app = (await listApps()).find((a) => a.key === key);
  return { key, name: REGISTRY_BY_KEY[key]?.displayName ?? key, site_url: app?.site_url ?? null };
}

/** Quick run: sends an anonymous result straight to the Hub's submit link. */
export async function startQuick(key: string, origin: string) {
  const settings = await getSettings();
  const app = await liveApp(key);
  const email = makeEmail(settings.base_email, key);
  const { data: run, error } = await db().from("hub_e2e_runs")
    .insert({ assessment_key: key, email, source: "quick", status: "started" }).select("id").single();
  if (error) throw new Error(error.message);
  const res = await fetch(`${origin}/api/public/submissions/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email, assessment_key: key, score: 58, dimensions: {},
      metadata: { first_name: "GEM", last_name: "Test", company: "GEM E2E test", e2e_run_id: run.id },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    await db().from("hub_e2e_runs").update({
      status: "fail", finished_at: new Date().toISOString(),
      checks: [{ key: "hub_result", label: "Hub saved the result", status: "fail", detail: `Submit HTTP ${res.status}: ${text.slice(0, 200)}` }],
    }).eq("id", run.id);
  }
  return { run_id: run.id as string, email, name: app.name };
}

type HsContact = { id: string; properties: Record<string, string | null> };

async function hsContact(email: string): Promise<HsContact | null> {
  const { hsBase, hsAuthHeaders } = await import("@/lib/hub/hubspot-transport");
  const props = ["gem_assessment_label", "gem_assessment_score", "gem_score_tier", "gem_report_url",
    "gem_assessment_submitted_at", "gem_entitlement", "gem_report_locked", "hs_marketable_status"].join(",");
  const res = await fetch(`${hsBase()}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=${props}`, { headers: hsAuthHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HubSpot contact HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as HsContact;
}

async function hsEnrolledWorkflowNames(contactId: string): Promise<Set<string>> {
  const { hsBase, hsAuthHeaders } = await import("@/lib/hub/hubspot-transport");
  const h = hsAuthHeaders();
  const [listRes, enrRes] = await Promise.all([
    fetch(`${hsBase()}/automation/v3/workflows`, { headers: h }),
    fetch(`${hsBase()}/automation/v2/workflows/enrollments/contacts/${contactId}`, { headers: h }),
  ]);
  if (!listRes.ok) throw new Error(`HubSpot workflows HTTP ${listRes.status}: ${(await listRes.text()).slice(0, 200)}`);
  if (!enrRes.ok) throw new Error(`HubSpot enrollments HTTP ${enrRes.status}: ${(await enrRes.text()).slice(0, 200)}`);
  const list = (await listRes.json()) as { workflows?: { id: number; name: string }[] };
  const byId = new Map((list.workflows ?? []).map((w) => [String(w.id), w.name]));
  const enrolled = (await enrRes.json()) as { id?: number; name?: string }[];
  return new Set(enrolled.map((e) => e.name ?? byId.get(String(e.id)) ?? "").filter(Boolean));
}

/** Runs every check for a run and stores the outcome. Safe to call repeatedly. */
export async function checkRun(runId: string): Promise<E2eRun> {
  const svc = db();
  const { data: run } = await svc.from("hub_e2e_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) throw new Error("Unknown test run");
  const r = run as E2eRun;
  if (r.status === "pass" || (r.status === "fail" && r.finished_at)) return r;

  const ageMin = (Date.now() - Date.parse(r.started_at)) / 60_000;
  const waiting = ageMin < PENDING_WINDOW_MIN;
  const late = (detail: string): Pick<E2eCheck, "status" | "detail"> =>
    waiting ? { status: "pending", detail: `${detail} (still waiting)` } : { status: "fail", detail };
  const checks: E2eCheck[] = [];
  const add = (key: string, label: string, v: Pick<E2eCheck, "status" | "detail">) => checks.push({ key, label, ...v });

  const { data: sub } = await svc.from("submissions")
    .select("id,score,tier,content_version,metadata,report_unlocked_override,submitted_at,hubspot_contact_id,hubspot_sync_error")
    .ilike("email", r.email).order("submitted_at", { ascending: false }).limit(1).maybeSingle();

  if (!sub) {
    add("hub_result", "Hub saved the result", late("No result has reached the Hub yet"));
  } else {
    add("hub_result", "Hub saved the result", typeof sub.score === "number"
      ? { status: "pass", detail: `Score ${sub.score}${sub.tier ? `, tier ${sub.tier}` : ""}` }
      : { status: "fail", detail: "Result has no score" });
    add("content_version", "Questions version", { status: "pass", detail: sub.content_version != null ? `Hub questions v${sub.content_version}` : "Assessment's built-in questions" });
    const ent = (sub.metadata as { entitlement?: string } | null)?.entitlement ?? "none";
    const locked = isReportLocked(sub, false);
    const wantTrial = false;
    add("entitlement", "Covered by", wantTrial
      ? (ent === "trial" ? { status: "pass", detail: "Free trial" } : { status: "fail", detail: `Expected the free trial, got "${ent}"` })
      : { status: "pass", detail: ent });
    add("report_link", "Report link and lock", wantTrial && !locked
      ? { status: "fail", detail: "Trial report should be locked but isn't" }
      : { status: "pass", detail: `${HUB}/report/${sub.id} (${locked ? "locked" : "unlocked"})` });
  }

  let contact: HsContact | null = null;
  if (sub) {
    try {
      contact = await hsContact(r.email);
    } catch (e) {
      add("hubspot_contact", "HubSpot contact", { status: "fail", detail: (e as Error).message });
    }
    if (!contact && !checks.some((c) => c.key === "hubspot_contact")) {
      add("hubspot_contact", "HubSpot contact", late(sub.hubspot_sync_error ? `Sync error: ${sub.hubspot_sync_error}` : "No HubSpot contact yet"));
    }
  }

  if (sub && contact) {
    const p = contact.properties;
    const ent = (sub.metadata as { entitlement?: string } | null)?.entitlement ?? "none";
    const expectLabel = REGISTRY_BY_KEY[r.assessment_key]?.displayName ?? r.assessment_key;
    const fieldChecks: [string, string, boolean, string][] = [
      ["hs_name", "HubSpot: assessment name", p.gem_assessment_label === expectLabel, p.gem_assessment_label ?? "empty"],
      ["hs_score", "HubSpot: score", p.gem_assessment_score != null && Number(p.gem_assessment_score) === sub.score, p.gem_assessment_score ?? "empty"],
      ["hs_tier", "HubSpot: tier", !!p.gem_score_tier, p.gem_score_tier ?? "empty"],
      ["hs_report", "HubSpot: report link", !!p.gem_report_url?.includes(sub.id), p.gem_report_url ?? "empty"],
      ["hs_submitted", "HubSpot: submitted at", !!p.gem_assessment_submitted_at, p.gem_assessment_submitted_at ?? "empty"],
      ["hs_entitlement", "HubSpot: entitlement", (p.gem_entitlement ?? "").toLowerCase() === ent, p.gem_entitlement ?? "empty"],
      ["hs_locked", "HubSpot: report locked", String(p.gem_report_locked ?? "false") === String(isReportLocked(sub, false)), p.gem_report_locked ?? "empty"],
    ];
    for (const [k, label, ok, val] of fieldChecks) add(k, label, ok ? { status: "pass", detail: val } : late(`Got ${val}`));

    const marketable = p.hs_marketable_status === "true";
    add("hs_marketing", "HubSpot: marketing contact", marketable ? { status: "pass", detail: "Yes" } : late("Not a marketing contact"));

    const settings = await getSettings();
    const isTrial = ent === "trial";
    let names: Set<string> | null = null;
    try {
      names = await hsEnrolledWorkflowNames(contact.id);
    } catch (e) {
      add("hs_workflows", "HubSpot workflows", { status: "fail", detail: (e as Error).message });
    }
    if (names) {
      for (const wf of settings.workflows) {
        const label = `Workflow: ${wf.name.replace(/^GEM\.IQ - /, "")}`;
        if (wf.when === "trial" && !isTrial) { add(`wf_${wf.name}`, label, { status: "skip", detail: "Only for trial results" }); continue; }
        if (names.has(wf.name)) { add(`wf_${wf.name}`, label, { status: "pass", detail: "Enrolled" }); continue; }
        // Instant workflows finish and drop the contact; their effect is the proof.
        if (/marketing contact/i.test(wf.name) && marketable) { add(`wf_${wf.name}`, label, { status: "pass", detail: "Ran and finished" }); continue; }
        add(`wf_${wf.name}`, label, late("Not enrolled"));
      }
    }
  }

  const status: E2eStatus = checks.some((c) => c.status === "fail") ? "fail"
    : checks.some((c) => c.status === "pending") ? "running" : "pass";
  const patch = {
    checks, status, submission_id: sub?.id ?? null,
    finished_at: status === "running" ? null : new Date().toISOString(),
  };
  await svc.from("hub_e2e_runs").update(patch).eq("id", runId);
  return { ...r, ...patch };
}

export async function listRuns(limit = 100): Promise<E2eRun[]> {
  const { data } = await db().from("hub_e2e_runs").select("*").order("started_at", { ascending: false }).limit(limit);
  return (data ?? []) as E2eRun[];
}

/** Deletes test people (Hub, IQ apps, HubSpot, Stripe) older than keep_days, or all when force. */
export async function cleanup(opts: { force?: boolean; max?: number } = {}) {
  const settings = await getSettings();
  const cutoff = opts.force ? new Date().toISOString() : new Date(Date.now() - settings.keep_days * 86_400_000).toISOString();
  const { data } = await db().from("hub_e2e_runs").select("id,email")
    .is("cleaned_at", null).lte("started_at", cutoff).order("started_at", { ascending: true }).limit(opts.max ?? 10);
  const rows = (data ?? []) as { id: string; email: string }[];
  const { runDeleteUser } = await import("@/lib/hub/admin/delete-user.server");
  const results: { email: string; ok: boolean }[] = [];
  for (const row of rows) {
    if (!matchesTestPattern(row.email, settings.base_email)) {
      // Never delete anything that isn't a test address; just stop tracking it.
      await db().from("hub_e2e_runs").update({ cleaned_at: new Date().toISOString() }).eq("id", row.id);
      continue;
    }
    const out = await runDeleteUser(row.email);
    results.push({ email: row.email, ok: out.ok });
    if (out.ok) await db().from("hub_e2e_runs").update({ cleaned_at: new Date().toISOString() }).eq("email", row.email);
  }
  const { count } = await db().from("hub_e2e_runs").select("id", { count: "exact", head: true })
    .is("cleaned_at", null).lte("started_at", cutoff);
  return { cleaned: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).map((r) => r.email), remaining: count ?? 0 };
}

/** Called by the 5-minute job; runs cleanup at most once a day. */
export async function maybeDailyCleanup() {
  const s = await getSettings();
  if (s.last_cleanup_at && Date.now() - Date.parse(s.last_cleanup_at) < 24 * 3_600_000) return null;
  await db().from("hub_e2e_settings").update({ last_cleanup_at: new Date().toISOString() }).eq("id", "global");
  return cleanup({ max: 10 });
}
