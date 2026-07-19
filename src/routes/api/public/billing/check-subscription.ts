import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR, createHubServiceClient } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";

export const Route = createFileRoute("/api/public/billing/check-subscription")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return json({ active: false, authenticated: false });

        const svc = createHubServiceClient();
        const { data } = await svc
          .from("subscriptions")
          .select("status,lookup_key,current_period_end,cancel_at_period_end,stripe_subscription_id")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const active = !!data && ["active", "trialing"].includes(data.status);
        return json({
          authenticated: true,
          active,
          subscription: data ?? null,
          user: { id: user.id, email: user.email },
        });
      },
    },
  },
});
