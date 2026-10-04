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
