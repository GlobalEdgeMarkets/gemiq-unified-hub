import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR, createHubServiceClient, selectCurrentSubscription } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";

export const Route = createFileRoute("/api/public/submissions/history")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return json({ error: "not_authenticated", submissions: [] }, { status: 401 }, request);
        const svc = createHubServiceClient();
        const { data } = await svc
          .from("submissions")
          .select("id,assessment_key,score,tier,submitted_at,hubspot_synced_at,metadata,report_unlocked_override")
          .eq("user_id", user.id)
          .eq("report_hidden", false)
          .order("submitted_at", { ascending: false })
          .limit(100);
        // Trial runs keep the full report locked until the plan is active.
        const { data: sub } = await selectCurrentSubscription<{ status: string | null }>(svc, user.id, "status");
        const planActive = sub?.status === "active";
        const { isReportLocked } = await import("@/lib/report-settings");
        const submissions = (data ?? []).map(({ metadata, report_unlocked_override, ...row }) => ({
          ...row,
          report_locked: isReportLocked({ metadata, report_unlocked_override }, planActive),
          report_url: `https://gemiq.globaledgemarkets.com/report/${row.id}`,
        }));
        return json({ submissions }, undefined, request);
      },
    },
  },
});
