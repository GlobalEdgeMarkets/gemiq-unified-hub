import { defineTool } from "@lovable.dev/mcp-js";
import { createHubUserClient, selectCurrentSubscription } from "@/lib/hub/supabase-server";

export default defineTool({
  name: "get_subscription",
  title: "Get my subscription status",
  description:
    "Returns the signed-in user's current GEM.IQ subscription: status (trialing/active/etc.), trial end date, and trial assessment usage.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createHubUserClient(ctx.getToken());
    const { data, error } = await selectCurrentSubscription(
      supabase,
      ctx.getUserId(),
      "status,lookup_key,current_period_end,cancel_at_period_end,trial_ends_at,trial_assessments_used,trial_assessment_limit",
    );
    if (error) {
      console.error("[mcp get_subscription]", error);
      return { content: [{ type: "text", text: "Could not load your subscription." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? { status: "none" }, null, 2) }],
      structuredContent: { subscription: data ?? null },
    };
  },
});
