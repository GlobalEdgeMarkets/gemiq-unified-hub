import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR, createHubServiceClient } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";

export const Route = createFileRoute("/api/public/submissions/history")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      GET: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return json({ error: "not_authenticated", submissions: [] }, { status: 401 });
        const svc = createHubServiceClient();
        const { data } = await svc
          .from("submissions")
          .select("id,assessment_key,score,tier,submitted_at,hubspot_synced_at")
          .eq("user_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(100);
        return json({ submissions: data ?? [] });
      },
    },
  },
});
