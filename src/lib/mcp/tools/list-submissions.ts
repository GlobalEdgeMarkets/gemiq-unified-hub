import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createHubUserClient } from "@/lib/hub/supabase-server";
import { LIVE_IQ_KEYS, LIVE_IQ_NAMES } from "../live-iqs";

export default defineTool({
  name: "list_submissions",
  title: "List my assessment submissions",
  description: `Lists the signed-in user's assessment submissions across all GEM.IQ tools (${LIVE_IQ_NAMES}), most recent first.`,
  inputSchema: {
    tool: z
      .enum(LIVE_IQ_KEYS)
      .optional()
      .describe(
        "Filter to a single IQ tool. Omit to list all tools. Historical submissions from retired IQs are returned only when no filter is given.",
      ),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tool, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createHubUserClient(ctx.getToken()!);
    // Explicit columns: raw `answers` and the CRM sync internals are needless
    // context for a client and pure token burn.
    let query = supabase
      .from("submissions")
      .select("id,assessment_key,score,tier,dimensions,submitted_at")
      .eq("user_id", ctx.getUserId()!)
      .order("submitted_at", { ascending: false })
      .limit(limit ?? 20);
    // The submissions table keys the IQ on assessment_key, not "tool".
    if (tool) query = query.eq("assessment_key", tool);
    const { data, error } = await query;
    if (error) {
      console.error("[mcp list_submissions]", error);
      return { content: [{ type: "text", text: "Could not load your submissions." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { submissions: data ?? [] },
    };
  },
});
