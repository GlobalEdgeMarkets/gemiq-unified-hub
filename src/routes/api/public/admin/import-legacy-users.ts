// Admin: invite a legacy IQ user into the Hub by email.
// - If they already have an auth account, no-op (returns existing).
// - Otherwise creates the auth user and sends a password-setup magic link.
// - Ensures a `profiles` row exists.
// Auth: x-job-secret header must match JOB_SECRET.
// Shared implementation lives in @/lib/hub/admin/legacy-users.server so the
// gated /admin console can call it in-process without the secret.
import { createFileRoute } from "@tanstack/react-router";
import { json, corsHeaders } from "@/lib/hub/http";
import { runImportLegacyUser } from "@/lib/hub/admin/legacy-users.server";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  full_name: z.string().optional(),
  company: z.string().optional(),
  hubspot_contact_id: z.string().optional(),
  send_invite: z.boolean().default(true),
});

export const Route = createFileRoute("/api/public/admin/import-legacy-users")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        if (request.headers.get("x-job-secret") !== process.env.JOB_SECRET)
          return new Response("forbidden", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 }, request);

        const result = await runImportLegacyUser(parsed.data);
        if (!result.ok) return json({ error: result.error, detail: result.detail }, { status: 500 }, request);
        const { ok, ...body } = result;
        return json(body, undefined, request);
      },
    },
  },
});
