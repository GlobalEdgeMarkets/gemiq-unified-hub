// Admin: invite a legacy IQ user into the Hub by email.
// - If they already have an auth account, no-op (returns existing).
// - Otherwise creates the auth user and sends a password-setup magic link.
// - Ensures a `profiles` row exists.
// Auth: x-job-secret header must match JOB_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";
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
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        if (request.headers.get("x-job-secret") !== process.env.JOB_SECRET)
          return new Response("forbidden", { status: 403 });
        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 400 });
        const { email, full_name, company, hubspot_contact_id, send_invite } = parsed.data;

        const svc = createHubServiceClient();

        // Look up existing auth user by email.
        const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
        let user = list?.users.find(u => (u.email ?? "").toLowerCase() === email.toLowerCase());
        let created = false;

        if (!user) {
          if (send_invite) {
            const { data, error } = await svc.auth.admin.inviteUserByEmail(email, {
              data: { full_name, company },
            });
            if (error) return json({ error: "invite_failed", detail: error.message }, { status: 500 });
            user = data.user; created = true;
          } else {
            const { data, error } = await svc.auth.admin.createUser({
              email, email_confirm: false, user_metadata: { full_name, company },
            });
            if (error) return json({ error: "create_failed", detail: error.message }, { status: 500 });
            user = data.user; created = true;
          }
        }

        if (user) {
          await svc.from("profiles").upsert({
            id: user.id,
            email,
            full_name: full_name ?? null,
            company: company ?? null,
            hubspot_contact_id: hubspot_contact_id ?? null,
          }, { onConflict: "id" });
        }

        return json({ user_id: user?.id, email, created, invited: created && send_invite });
      },
    },
  },
});
