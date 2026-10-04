// GEM Hub Central control plane: the registry of IQ apps (addresses, lifecycle,
// pause/notice), global editable wording, health checks against each app's
// hub-status link, and onboarding verification. Server-only.
import { createHubServiceClient } from "./supabase-server";

export type NoticeLevel = "info" | "warning" | "critical";

export type IqAppRow = {
  key: string;
  name: string;
  site_url: string;
  track: "capability" | "specialist";
  description: string | null;
  purge_url: string | null;
  status_url: string | null;
  lifecycle: "onboarding" | "live" | "retired";
  paused: boolean;
  notice: string | null;
  notice_level: NoticeLevel;
  onboarding_checks: Record<string, { ok: boolean; at: string; detail?: string }>;
  last_status: HealthResult | null;
  last_checked_at: string | null;
};

export type GlobalSettings = {
  notice: string | null;
  notice_level: NoticeLevel;
  checkout_cta: string | null;
  guarantee_line: string | null;
  trial_line: string | null;
  updated_at: string;
};

// The DB types are regenerated from the schema; narrow at this boundary.
function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createHubServiceClient() as any;
}

export async function listApps(): Promise<IqAppRow[]> {
  const { data, error } = await db().from("hub_iq_apps").select("*").order("created_at");
  if (error) throw new Error(`Could not load apps: ${error.message}`);
  return (data ?? []) as IqAppRow[];
}

export async function getGlobal(): Promise<GlobalSettings | null> {
  const { data, error } = await db().from("hub_global_settings").select("*").maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data as GlobalSettings | null;
}

/** Public, safe slice merged into /api/public/manifest. Never throws. */
export async function getPublicControl(): Promise<{
  global: { notice: string | null; notice_level: NoticeLevel };
  apps: Record<string, { paused: boolean; notice: string | null; notice_level: NoticeLevel; lifecycle: string }>;
  copy: { checkout_cta: string | null; guarantee_line: string | null; trial_line: string | null };
} | null> {
  try {
    const [apps, g] = await Promise.all([listApps(), getGlobal()]);
    return {
      global: { notice: g?.notice ?? null, notice_level: g?.notice_level ?? "info" },
      apps: Object.fromEntries(
        apps.map((a) => [a.key, { paused: a.paused, notice: a.notice, notice_level: a.notice_level, lifecycle: a.lifecycle }]),
      ),
      copy: {
        checkout_cta: g?.checkout_cta ?? null,
        guarantee_line: g?.guarantee_line ?? null,
        trial_line: g?.trial_line ?? null,
      },
    };
  } catch (e) {
    console.error("[app-control] public control unavailable", e);
    return null;
  }
}

export async function updateApp(
  key: string,
  patch: Partial<Pick<IqAppRow, "paused" | "notice" | "notice_level" | "purge_url" | "status_url" | "site_url" | "lifecycle" | "description">>,
  by: string,
) {
  const { error } = await db()
    .from("hub_iq_apps")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: by })
    .eq("key", key);
  if (error) throw new Error(`Could not update ${key}: ${error.message}`);
  return { ok: true };
}

export async function updateGlobal(patch: Partial<Omit<GlobalSettings, "updated_at">>, by: string) {
  const { error } = await db()
    .from("hub_global_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: by })
    .eq("id", true);
  if (error) throw new Error(`Could not save settings: ${error.message}`);
  return { ok: true };
}

export async function registerApp(input: {
  key: string;
  name: string;
  site_url: string;
  track: "capability" | "specialist";
  description?: string;
}, by: string) {
  const { error } = await db().from("hub_iq_apps").insert({
    ...input,
    purge_url: `${input.site_url.replace(/\/$/, "")}/api/public/purge-user`,
    status_url: `${input.site_url.replace(/\/$/, "")}/api/public/hub-status`,
    lifecycle: "onboarding",
    updated_by: by,
  });
  if (error) {
    if (error.code === "23505") throw new Error(`An assessment with key "${input.key}" already exists.`);
    throw new Error(`Could not register: ${error.message}`);
  }
  return { ok: true };
}

/** Apps whose purge link "Delete user" should call. */
export async function purgeTargets(): Promise<{ key: string; url: string }[]> {
  const apps = await listApps();
  return apps.filter((a) => a.purge_url && a.lifecycle !== "retired").map((a) => ({ key: a.key, url: a.purge_url! }));
}

export type HealthResult = {
  key: string;
  light: "green" | "yellow" | "red";
  reachable: boolean;
  manifest_version: string | null;
  app_version: string | null;
  checks: Record<string, boolean>;
  problems: string[];
  checked_at: string;
};

export async function checkApp(app: IqAppRow, currentVersion: string, expectedContent: number | null = null): Promise<HealthResult> {
  const checked_at = new Date().toISOString();
  const base: HealthResult = {
    key: app.key, light: "red", reachable: false, manifest_version: null, app_version: null,
    checks: {}, problems: [], checked_at,
  };
  const secret = process.env.HUB_PURGE_SECRET;
  if (!secret) return { ...base, problems: ["HUB_PURGE_SECRET is not set in GEM Hub Central"] };
  if (!app.status_url) return { ...base, problems: ["No status link registered"] };
  try {
    const res = await fetch(app.status_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-purge-secret": secret },
      body: JSON.stringify({ hub_manifest_version: currentVersion, hub_content_version: expectedContent }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { ...base, problems: ["Status link not added yet (404) — paste the sync prompt into this app"] };
    if (res.status === 401) return { ...base, problems: ["App refused the shared key (401) — HUB_PURGE_SECRET differs"] };
    if (!res.ok) return { ...base, problems: [`Status link error (${res.status})`] };
    const j = (await res.json()) as { manifest_version?: string; app_version?: string; checks?: Record<string, boolean>; content_version?: number | null };
    const checks = j.checks ?? {};
    const problems: string[] = [];
    for (const [k, v] of Object.entries(checks)) if (!v) problems.push(`${k} failing`);
    if (!j.manifest_version) problems.push("App did not report which settings version it uses");
    else if (j.manifest_version !== currentVersion) problems.push(`Using settings ${j.manifest_version}, current is ${currentVersion}`);
    if (expectedContent != null && j.content_version !== expectedContent) {
      problems.push(j.content_version == null
        ? `Not loading Hub questions yet (published version ${expectedContent}) — paste the Content prompt`
        : `Using questions version ${j.content_version}, published is ${expectedContent}`);
    }
    const light = problems.length === 0 ? "green" : Object.values(checks).some((v) => !v) ? "red" : "yellow";
    const out: HealthResult = {
      ...base, reachable: true, light, manifest_version: j.manifest_version ?? null,
      app_version: j.app_version ?? null, checks, problems,
    };
    return out;
  } catch (e) {
    console.error(`[app-control] status ${app.key} failed`, e);
    return { ...base, problems: ["Could not reach the status link"] };
  }
}

export async function saveHealth(r: HealthResult) {
  await db().from("hub_iq_apps").update({ last_status: r, last_checked_at: r.checked_at }).eq("key", r.key);
}

/** Runs onboarding checks for one app and stores the results. */
export async function verifyOnboarding(key: string, currentVersion: string) {
  const apps = await listApps();
  const app = apps.find((a) => a.key === key);
  if (!app) throw new Error("Unknown assessment");
  const now = new Date().toISOString();
  const checks: IqAppRow["onboarding_checks"] = {};

  const { publishedVersions } = await import("@/lib/hub/content.server");
  const health = await checkApp(app, currentVersion, (await publishedVersions().catch(() => ({} as Record<string, number>)))[key] ?? null);
  checks.status_link = { ok: health.reachable, at: now, detail: health.problems[0] };
  checks.settings_current = { ok: health.manifest_version === currentVersion, at: now, detail: health.manifest_version ?? "not reported" };

  const secret = process.env.HUB_PURGE_SECRET;
  if (app.purge_url && secret) {
    try {
      const res = await fetch(app.purge_url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hub-purge-secret": secret },
        body: JSON.stringify({ email: `hub-onboarding-check+${key}@globaledgemarkets.com` }),
        signal: AbortSignal.timeout(8000),
      });
      checks.delete_link = { ok: res.ok, at: now, detail: res.ok ? undefined : `HTTP ${res.status}` };
    } catch {
      checks.delete_link = { ok: false, at: now, detail: "unreachable" };
    }
  } else checks.delete_link = { ok: false, at: now, detail: "no delete link" };

  const { count } = await db()
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_key", key);
  checks.result_received = { ok: (count ?? 0) > 0, at: now, detail: `${count ?? 0} results` };

  try {
    const host = new URL(app.site_url).hostname;
    const { runHostSeen } = await import("@/lib/posthog-audit.server");
    const seen = await runHostSeen(host);
    checks.posthog = { ok: seen, at: now, detail: seen ? undefined : "no activity in last 7 days" };
  } catch (e) {
    checks.posthog = { ok: false, at: now, detail: e instanceof Error ? e.message : "check failed" };
  }

  await db().from("hub_iq_apps").update({ onboarding_checks: checks, updated_at: now }).eq("key", key);
  return checks;
}
