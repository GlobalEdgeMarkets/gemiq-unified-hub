// Thin server-function wrappers for the admin console.
// Module scope holds imports and server-fn declarations only (tss-serverfn-split).
// JOB_SECRET is never involved here: these call the shared handler bodies
// in-process after verifying the caller is an allowlisted admin.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const adminWhoami = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdminEmail } = await import("@/lib/hub/admin/guard.server");
    const email = typeof context.claims?.email === "string" ? context.claims.email : null;
    return { email, is_admin: isAdminEmail(email) };
  });

export const adminBootstrapHubspot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin(context.claims as Record<string, unknown>);
    const { runBootstrapHubspotSchema } = await import("@/lib/hub/admin/hubspot-bootstrap.server");
    return await runBootstrapHubspotSchema();
  });

export const adminImportLegacyUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    assertAdmin(context.claims as Record<string, unknown>);
    const { runImportLegacyUser } = await import("@/lib/hub/admin/legacy-users.server");
    return await runImportLegacyUser(data);
  });

export const adminRegistryStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin(context.claims as Record<string, unknown>);
    const { getRegistryStatus } = await import("@/lib/hub/admin/status.server");
    return getRegistryStatus();
  });

export const adminPreflight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin(context.claims as Record<string, unknown>);
    const { runPreflight } = await import("@/lib/hub/admin/status.server");
    return await runPreflight();
  });

export const adminListSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().optional(),
      assessment_key: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/hub/admin/guard.server");
    assertAdmin(context.claims as Record<string, unknown>);
    const { listSubmissions } = await import("@/lib/hub/admin/status.server");
    return await listSubmissions(data);
  });
