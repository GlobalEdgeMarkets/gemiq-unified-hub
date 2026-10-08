import { createFileRoute } from "@tanstack/react-router";
import { createHubServiceClient, selectCurrentSubscription } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";
import { isReportLocked } from "@/lib/report-settings";
import { z } from "zod";

// Lock status for one submission. Returns only a boolean + entitlement label
// for an unguessable id — no personal data.
export const Route = createFileRoute("/api/public/submissions/status")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id") ?? "";
        if (!z.string().uuid().safeParse(id).success) return json({ error: "invalid_id" }, { status: 400 }, request);
        const svc = createHubServiceClient();
        const { data: row } = await svc.from("submissions")
          .select("id,user_id,report_unlocked_override,metadata").eq("id", id).maybeSingle();
        if (!row) return json({ error: "not_found" }, { status: 404 }, request);
        let planActive = false;
        if (row.user_id) {
          const { data: s } = await selectCurrentSubscription<{ status: string }>(svc, row.user_id, "status");
          planActive = s?.status === "active";
        }
        const ent = (row.metadata as { entitlement?: string } | null)?.entitlement ?? null;
        return json({ id: row.id, report_locked: isReportLocked(row, planActive), entitlement: ent }, undefined, request);
      },
    },
  },
});
