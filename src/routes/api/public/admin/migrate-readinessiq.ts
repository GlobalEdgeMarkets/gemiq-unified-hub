// Admin: migrate legacy ReadinessIQ assessments into the four IQ keys.
// Auth: x-job-secret header must match JOB_SECRET.
// Dry run by default; a real run requires confirm_calibrated: true.
import { createFileRoute } from "@tanstack/react-router";
import { json, corsHeaders } from "@/lib/hub/http";
import { z } from "zod";

const Body = z.object({
  dry_run: z.boolean().default(true),
  email: z.string().email().optional(),
  limit: z.number().int().min(1).max(5000).optional(),
  confirm_calibrated: z.boolean().optional(),
  create_users: z.boolean().default(false),
});

export const Route = createFileRoute("/api/public/admin/migrate-readinessiq")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        if (request.headers.get("x-job-secret") !== process.env.JOB_SECRET)
          return new Response("forbidden", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success)
          return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 }, request);
        try {
          const { runMigrateReadinessIQ } = await import("@/lib/hub/admin/readiness-migrate.server");
          const out = await runMigrateReadinessIQ(parsed.data);
          return json(out, { status: "ok" in out && out.ok === false ? 400 : 200 }, request);
        } catch (e) {
          return json({ error: "migration_failed", detail: e instanceof Error ? e.message : String(e) }, { status: 500 }, request);
        }
      },
    },
  },
});
