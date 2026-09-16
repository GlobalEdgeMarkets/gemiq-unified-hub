import { defineTool } from "@lovable.dev/mcp-js";
import { createHubUserClient } from "@/lib/hub/supabase-server";

export default defineTool({
  name: "get_profile",
  title: "Get my GEM.IQ profile",
  description: "Returns the signed-in user's GEM.IQ Hub profile (name, company, title, role, industry, email).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createHubUserClient(ctx.getToken()!);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name,full_name,company,title,role,industry,created_at")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error) {
      console.error("[mcp get_profile]", error);
      return { content: [{ type: "text", text: "Could not load your profile." }], isError: true };
    }
    const profile = { ...(data ?? {}), email: ctx.getUserEmail() };
    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: { profile },
    };
  },
});
