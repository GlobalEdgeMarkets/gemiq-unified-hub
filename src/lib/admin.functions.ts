// Thin server-function wrappers for the admin console.
// Module scope holds imports and server-fn declarations only (tss-serverfn-split).
// JOB_SECRET is never involved here: these call the shared handler bodies
// in-process after verifying the caller is an allowlisted admin.
import { createServerFn } from "@tanstack/react-start";
import { requireHubAdmin } from "@/lib/hub/admin/middleware";
import { z } from "zod";

// Never throws: anonymous callers get a signed-out payload so /admin can render
// its sign-in state instead of crashing with an unhandled 401.
export const adminWhoami = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveHubAdmin } = await import("@/lib/hub/admin/resolve.server");
  const hubAdmin = await resolveHubAdmin();
  return {
    signed_in: !!hubAdmin,
    email: hubAdmin?.email ?? null,
    is_admin: hubAdmin?.isAdmin ?? false,
  };
});

export const adminBootstrapHubspot = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runBootstrapHubspotSchema } = await import("@/lib/hub/admin/hubspot-bootstrap.server");
    return await runBootstrapHubspotSchema();
  });

export const adminImportLegacyUser = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email(),
      full_name: z.string().optional(),
      company: z.string().optional(),
      hubspot_contact_id: z.string().optional(),
      send_invite: z.boolean().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runImportLegacyUser } = await import("@/lib/hub/admin/legacy-users.server");
    return await runImportLegacyUser(data);
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runDeleteUser } = await import("@/lib/hub/admin/delete-user.server");
    return await runDeleteUser(data.email);
  });

export const adminRegistryStatus = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { getRegistryStatus } = await import("@/lib/hub/admin/status.server");
    return getRegistryStatus();
  });

export const adminPreflight = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runPreflight } = await import("@/lib/hub/admin/status.server");
    return await runPreflight();
  });

export const adminListSubmissions = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().optional(),
      assessment_key: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { listSubmissions } = await import("@/lib/hub/admin/status.server");
    return await listSubmissions(data);
  });

export const adminCalibrateReadinessScores = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(200).optional(),
      email: z.string().optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runCalibrateReadinessScores } = await import("@/lib/hub/admin/readiness-migrate.server");
    return await runCalibrateReadinessScores({ limit: data.limit, email: data.email?.trim() || undefined });
  });

export const adminMigrateReadinessIQ = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      dry_run: z.boolean().default(true),
      email: z.string().optional(),
      limit: z.number().int().min(1).max(5000).optional(),
      confirm_calibrated: z.boolean().optional(),
      create_users: z.boolean().default(false),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runMigrateReadinessIQ } = await import("@/lib/hub/admin/readiness-migrate.server");
    return await runMigrateReadinessIQ({ ...data, email: data.email?.trim() || undefined });
  });

const AUDIT_SITE_KEYS = ["gemiq", "tariffiq", "gtmiq", "salesiq", "productiq", "aitransformiq", "uxiq"] as const;

export const adminPostHogAudit = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z
      .object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        sites: z.array(z.enum(AUDIT_SITE_KEYS)).min(1),
      })
      .refine((d) => d.from <= d.to, "Start date must be before end date")
      .refine((d) => (Date.parse(d.to) - Date.parse(d.from)) / 86_400_000 <= 90, "Range can be at most 90 days")
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { runPostHogAudit } = await import("@/lib/posthog-audit.server");
    return await runPostHogAudit(data);
  });

// ---- GEM Hub Central control plane ----
const noticeLevel = z.enum(["info", "warning", "critical"]);
const appKey = z.string().regex(/^[a-z0-9]{2,32}$/);

export const adminListApps = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { listApps, getGlobal } = await import("@/lib/hub/app-control.server");
    const manifest = (await import("@/lib/hub/manifest.json")).default;
    const [apps, global] = await Promise.all([listApps(), getGlobal()]);
    return { apps, global, manifest_version: manifest.version };
  });

export const adminUpdateApp = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      key: appKey,
      patch: z.object({
        paused: z.boolean().optional(),
        notice: z.string().max(500).nullable().optional(),
        notice_level: noticeLevel.optional(),
        status_url: z.string().url().nullable().optional(),
        purge_url: z.string().url().nullable().optional(),
        lifecycle: z.enum(["onboarding", "live", "retired"]).optional(),
      }),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { updateApp } = await import("@/lib/hub/app-control.server");
    return await updateApp(data.key, data.patch, by);
  });

export const adminUpdateGlobal = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      notice: z.string().max(500).nullable(),
      notice_level: noticeLevel,
      checkout_cta: z.string().max(120).nullable(),
      guarantee_line: z.string().max(200).nullable(),
      trial_line: z.string().max(400).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { updateGlobal } = await import("@/lib/hub/app-control.server");
    return await updateGlobal(data, by);
  });

export const adminCheckHealth = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { listApps, checkApp, saveHealth } = await import("@/lib/hub/app-control.server");
    const manifest = (await import("@/lib/hub/manifest.json")).default;
    const apps = (await listApps()).filter((a) => a.lifecycle !== "retired");
    const { publishedVersions } = await import("@/lib/hub/content.server");
    const pv = await publishedVersions().catch(() => ({} as Record<string, number>));
    const results = await Promise.all(apps.map((a) => checkApp(a, manifest.version, pv[a.key] ?? null)));
    await Promise.all(results.map(saveHealth));
    return results;
  });

export const adminRegisterApp = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      key: appKey,
      name: z.string().trim().min(2).max(40),
      site_url: z.string().url().startsWith("https://"),
      track: z.enum(["capability", "specialist"]),
      description: z.string().max(300).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { registerApp } = await import("@/lib/hub/app-control.server");
    return await registerApp(data, by);
  });

export const adminVerifyOnboarding = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) => z.object({ key: appKey }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { verifyOnboarding } = await import("@/lib/hub/app-control.server");
    const manifest = (await import("@/lib/hub/manifest.json")).default;
    return await verifyOnboarding(data.key, manifest.version);
  });

// ---- Report control ----
const sectionKey = z.enum(["summary", "score_tier", "dimensions", "strengths", "gaps", "recommendations", "next_steps", "talk_to_gem"]);
const reportOverride = z.object({
  sections: z.array(z.object({ key: sectionKey, enabled: z.boolean() })).max(8).optional(),
  trial_access: z.enum(["score", "score_tier", "score_tier_dimensions"]).optional(),
  copy: z.object({
    title_pattern: z.string().max(120),
    intro: z.string().max(400),
    disclaimer: z.string().max(600),
    closing_message: z.string().max(300),
    closing_cta: z.string().max(60),
    closing_url: z.string().url().or(z.literal("")),
  }).partial().optional(),
  tiers: z.array(z.object({
    key: z.string().max(32),
    label: z.string().min(1).max(32),
    min: z.number().min(0).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })).min(2).max(8).optional(),
  mode: z.enum(["app", "hub"]).optional(),
});

export const adminGetReportSettings = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { getAllSettings } = await import("@/lib/hub/report-control.server");
    return await getAllSettings();
  });

export const adminSaveReportSettings = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({ scope: z.union([z.literal("global"), appKey]), settings: reportOverride.nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { saveSettings } = await import("@/lib/hub/report-control.server");
    return await saveSettings(data.scope, data.settings, by);
  });

export const adminListReports = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      assessment_key: z.string().max(32).optional(),
      email: z.string().max(200).optional(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      tier: z.string().max(32).optional(),
      lock: z.enum(["locked", "unlocked", "all"]).optional(),
      include_hidden: z.boolean().optional(),
      limit: z.number().int().min(1).max(1000).optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { listReports } = await import("@/lib/hub/report-control.server");
    return await listReports(data);
  });

export const adminReportAction = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["unlock", "relock", "clear_override", "hide", "unhide", "regenerate", "resend"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { reportAction } = await import("@/lib/hub/report-control.server");
    return await reportAction(data.id, data.action, by);
  });

// ---- Reset all reports ----
export const adminResetPreview = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { resetPreview } = await import("@/lib/hub/admin/reset-reports.server");
    return await resetPreview();
  });

export const adminResetBatch = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({ confirm: z.literal("RESET"), offset: z.number().int().min(0) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { resetBatch } = await import("@/lib/hub/admin/reset-reports.server");
    return await resetBatch(data.offset);
  });

export const adminResetFinish = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("RESET") }).parse(input))
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { resetFinish } = await import("@/lib/hub/admin/reset-reports.server");
    return await resetFinish(by);
  });

// ---- Follow-up emails ----
const stepKey = z.enum(["tier_advice", "unlock", "retake"]);

export const adminContentVersions = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) => z.object({ key: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { listVersions, scoreMismatches } = await import("@/lib/hub/content.server");
    const [versions, mismatches] = await Promise.all([listVersions(data.key), scoreMismatches(20)]);
    return { versions, mismatches: mismatches.filter((m: { assessment_key: string }) => m.assessment_key === data.key) };
  });

export const adminContentAction = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      key: z.string().min(1).max(64),
      action: z.enum(["save", "discard", "publish", "rollback", "import"]),
      body: z.any().optional(),
      version: z.number().int().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const c = await import("@/lib/hub/content.server");
    switch (data.action) {
      case "save": return await c.saveDraft(data.key, data.body, by);
      case "discard": return await c.discardDraft(data.key);
      case "publish": return await c.publishDraft(data.key, by);
      case "rollback": return await c.rollbackTo(data.key, data.version ?? 0, by);
      case "import": return await c.importFromApp(data.key, by);
    }
  });

// ---- End-to-end tests ----
export const adminE2eOverview = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const e = await import("@/lib/hub/e2e/e2e.server");
    const { LIVE_REGISTRY } = await import("@/lib/hub/assessments");
    const [settings, runs] = await Promise.all([e.getSettings(), e.listRuns(150)]);
    return {
      settings, runs,
      assessments: LIVE_REGISTRY.map((s) => ({ key: s.key, name: s.displayName })),
    };
  });

export const adminE2eAction = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      action: z.enum(["quick", "check", "cleanup", "cleanup_all"]),
      key: appKey.optional(),
      id: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const e = await import("@/lib/hub/e2e/e2e.server");
    switch (data.action) {
      case "quick": {
        if (!data.key) throw new Error("Pick an assessment");
        const { getRequest } = await import("@tanstack/react-start/server");
        const origin = new URL(getRequest().url).origin;
        return await e.startQuick(data.key, origin);
      }
      case "check":
        if (!data.id) throw new Error("Missing run");
        return await e.checkRun(data.id);
      case "cleanup": return await e.cleanup({ max: 10 });
      case "cleanup_all": return await e.cleanup({ force: true, max: 10 });
    }
  });

export const adminE2eSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      enabled: z.boolean(),
      base_email: z.string().email(),
      keep_days: z.number().int().min(0).max(60),
      assessments: z.array(appKey).max(20),
      workflows: z.array(z.object({ name: z.string().min(1).max(120), when: z.enum(["always", "trial"]) })).max(20),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { saveSettings } = await import("@/lib/hub/e2e/e2e.server");
    return await saveSettings(data, by);
  });

// ---- Overview (read-only): one-screen "is anything wrong?" ----
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { listApps } = await import("@/lib/hub/app-control.server");
    const { listRuns } = await import("@/lib/hub/e2e/e2e.server");
    const { scoreMismatches } = await import("@/lib/hub/content.server");
    const { createHubServiceClient } = await import("@/lib/hub/supabase-server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = createHubServiceClient();
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [apps, runs, mismatches, subs, retry] = await Promise.all([
      listApps(),
      listRuns(60).catch(() => []),
      scoreMismatches(50).catch(() => []),
      db.from("submissions").select("assessment_key,metadata,email").gte("submitted_at", weekAgo).limit(2000),
      db.from("retry_queue").select("status").in("status", ["pending", "dead"]).limit(1000),
    ]);
    const results = ((subs.data ?? []) as { assessment_key: string; metadata: { entitlement?: string } | null; email: string }[])
      .filter((r) => !/\+(gemtest|checkly)-/i.test(r.email ?? ""));
    const byEnt: Record<string, number> = {};
    for (const r of results) { const e = r.metadata?.entitlement ?? "none"; byEnt[e] = (byEnt[e] ?? 0) + 1; }
    const latest: Record<string, { status: string; at: string }> = {};
    for (const r of runs) if (!latest[r.assessment_key]) latest[r.assessment_key] = { status: r.status, at: r.started_at };
    const rq = (retry.data ?? []) as { status: string }[];
    return {
      apps: apps.filter((a) => a.lifecycle !== "retired").map((a) => ({
        key: a.key, name: a.name, paused: a.paused, lifecycle: a.lifecycle,
        light: (a.last_status as { light?: string } | null)?.light ?? null,
        problems: (a.last_status as { problems?: string[] } | null)?.problems ?? [],
        checked_at: a.last_checked_at,
      })),
      week: { total: results.length, by_entitlement: byEnt },
      tests: latest,
      mismatches: mismatches.length,
      retry: { pending: rq.filter((x) => x.status === "pending").length, failed: rq.filter((x) => x.status === "dead").length },
    };
  });

// ---- Find a person (read-only) ----
export const adminPersonLookup = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) => z.object({ email: z.string().email().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const email = data.email.trim().toLowerCase();
    const { createHubServiceClient } = await import("@/lib/hub/supabase-server");
    const { listReports } = await import("@/lib/hub/report-control.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = createHubServiceClient();
    const { data: prof } = await db.from("profiles")
      .select("id,email,full_name,company,title,created_at").ilike("email", email).maybeSingle();
    const { data: subs } = prof
      ? await db.from("subscriptions").select("status,lookup_key,trial_ends_at,trial_assessments_used,trial_assessment_limit,current_period_end,cancel_at_period_end,updated_at")
          .eq("user_id", prof.id).order("updated_at", { ascending: false }).limit(5)
      : { data: [] };
    const reports = await listReports({ email, include_hidden: true, limit: 100 }).catch(() => null);
    const items = ((reports as { items?: { email: string }[] } | null)?.items ?? [])
      .filter((r) => (r.email ?? "").toLowerCase() === email);

    let hubspot: { found: boolean; marketing?: boolean; tier?: string | null; assessment?: string | null; entitlement?: string | null; locked?: string | null; error?: string } = { found: false };
    try {
      const { hsBase, hsAuthHeaders } = await import("@/lib/hub/hubspot-transport");
      const res = await fetch(`${hsBase()}/crm/v3/objects/contacts/search`, {
        method: "POST", headers: hsAuthHeaders(),
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
          properties: ["hs_marketable_status", "gem_score_tier", "gem_assessment_label", "gem_entitlement", "gem_report_locked"], limit: 1,
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { results?: { properties: Record<string, string | null> }[] };
        const p = j.results?.[0]?.properties;
        if (p) hubspot = {
          found: true, marketing: p.hs_marketable_status === "true", tier: p.gem_score_tier,
          assessment: p.gem_assessment_label, entitlement: p.gem_entitlement, locked: p.gem_report_locked,
        };
      } else hubspot = { found: false, error: `HubSpot said ${res.status}` };
    } catch (e) { hubspot = { found: false, error: (e as Error).message }; }

    return { email, profile: prof ?? null, subscriptions: subs ?? [], reports: items, hubspot };
  });

// ---- Combined GEM.IQ score + methodology ----
const compositeTier = z.object({ key: z.string().min(1).max(64), label: z.string().min(1).max(80), min: z.number().min(0).max(100) });
const methodologyInput = z.object({
  overview: z.string().max(4000), scoring: z.string().max(4000), maturity_model: z.string().max(4000),
  data_sources: z.string().max(4000), how_to_read: z.string().max(4000),
});

export const adminGetComposite = createServerFn({ method: "GET" })
  .middleware([requireHubAdmin])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin({ email: context.hubAdmin.email });
    const { getCompositeConfig } = await import("@/lib/hub/composite.server");
    const { LIVE_REGISTRY } = await import("@/lib/hub/assessments");
    const cfg = await getCompositeConfig();
    return { ...cfg, apps: LIVE_REGISTRY.map((s) => ({ key: s.key, name: s.displayName })) };
  });

export const adminSaveComposite = createServerFn({ method: "POST" })
  .middleware([requireHubAdmin])
  .inputValidator((input: unknown) =>
    z.object({
      settings: z.object({
        weights: z.record(appKey, z.number().min(0).max(100)),
        tiers: z.array(compositeTier).min(1).max(10),
        min_for_tier: z.number().int().min(1).max(20),
      }).optional(),
      methodology: methodologyInput.optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    const by = assertAdmin({ email: context.hubAdmin.email });
    const { saveCompositeConfig } = await import("@/lib/hub/composite.server");
    return await saveCompositeConfig(data, by);
  });
