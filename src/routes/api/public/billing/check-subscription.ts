import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR, createHubServiceClient } from "@/lib/hub/supabase-server";
import { json, corsHeaders } from "@/lib/hub/http";
import { reconcileSubscriptionForUser } from "@/lib/hub/subscription-sync.server";

export const Route = createFileRoute("/api/public/billing/check-subscription")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return json({ active: false, authenticated: false }, undefined, request);

        const svc = createHubServiceClient();
        let { data, error } = await svc
          .from("subscriptions")
          .select("status,lookup_key,current_period_end,cancel_at_period_end,stripe_subscription_id,trial_ends_at,trial_assessments_used,trial_assessment_limit")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) return json({ error: "subscription_lookup_failed" }, { status: 500 }, request);

        // Stripe remains the source of truth. This self-heals checkout returns
        // when a webhook is delayed or its delivery configuration is stale.
        if (!data || !["active", "trialing"].includes(data.status)) {
          try {
            await reconcileSubscriptionForUser(user.id, user.email ?? "");
            const refreshed = await svc
              .from("subscriptions")
              .select("status,lookup_key,current_period_end,cancel_at_period_end,stripe_subscription_id,trial_ends_at,trial_assessments_used,trial_assessment_limit")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (refreshed.error) throw refreshed.error;
            data = refreshed.data;
          } catch (reconcileError) {
            console.error("[subscription reconciliation]", reconcileError);
          }
        }

        const active = !!data && ["active", "trialing"].includes(data.status);
        const trialing = data?.status === "trialing";
        const trialExhausted = trialing
          && (data?.trial_assessments_used ?? 0) >= (data?.trial_assessment_limit ?? 1);
        return json({
          authenticated: true,
          active,
          trialing,
          trial_exhausted: trialExhausted,
          subscription: data ?? null,
          user: { id: user.id, email: user.email },
        }, undefined, request);
      },
    },
  },
});
