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
  const { resolveHubAdmin } = await import("@/lib/hub/admin/middleware");
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
