// Admin: backfill legacy IQ submissions into the Hub.
// Accepts an array of submissions; each is inserted (unless a matching row
// already exists for that email+assessment+submitted_at) and pushed through
// the same registry-driven HubSpot upsert as live traffic.
// Implementation lives in src/lib/hub/admin/legacy-submissions.server.ts so the
// ReadinessIQ migration can reuse the identical path.
// Auth: x-job-secret header must match JOB_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { json, corsHeaders } from "@/lib/hub/http";
import { SubmissionPayloadSchema } from "@/lib/hub/schemas";
import { z } from "zod";

const Body = z.object({
  /** Set true to skip the HubSpot write (DB-only backfill). */
  skip_hubspot: z.boolean().default(false),
  submissions: z.array(SubmissionPayloadSchema).max(500),
});

export const Route = createFileRoute("/api/public/admin/import-legacy-submissions")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        if (request.headers.get("x-job-secret") !== process.env.JOB_SECRET)
          return new Response("forbidden", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 }, request);

        const { runImportLegacySubmissions } = await import("@/lib/hub/admin/legacy-submissions.server");
        const out = await runImportLegacySubmissions(parsed.data);
        return json(out, undefined, request);
      },
    },
  },
});
