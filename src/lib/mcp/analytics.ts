// PostHog MCP Analytics for the Hub's MCP server. @lovable.dev/mcp-js has no
// official-SDK server object to pass to instrument(), so each tool handler is
// wrapped and reports via PostHogMCP (custom-dispatcher path). Events are
// flushed before the handler returns because the Worker may stop right after.
import type { PostHogMCP } from "@posthog/mcp";

let client: PostHogMCP | null = null;

async function getClient(): Promise<PostHogMCP | null> {
  if (client) return client;
  const token = process.env.POSTHOG_API_KEY;
  if (!token) return null;
  const { PostHogMCP } = await import("@posthog/mcp");
  const host = process.env.POSTHOG_REGION === "eu" ? "https://eu.i.posthog.com" : "https://us.i.posthog.com";
  client = new PostHogMCP(token, { host, flushAt: 1, flushInterval: 0 });
  return client;
}

type AnyTool = {
  name: string;
  description?: string;
  handler: (input: any, ctx: any) => Promise<any>;
};

export function withAnalytics<T>(toolIn: T): T {
  const tool = toolIn as unknown as AnyTool;
  const inner = tool.handler;
  const handler = async (input: any, ctx: any) => {
    const start = Date.now();
    let result: any;
    let thrown: unknown;
    try {
      result = await inner(input, ctx);
      return result;
    } catch (e) {
      thrown = e;
      throw e;
    } finally {
      try {
        const ph = await getClient();
        if (ph) {
          const userId = ctx?.isAuthenticated?.() ? ctx.getUserId?.() : undefined;
          ph.captureToolCall({
            toolName: tool.name,
            toolDescription: tool.description,
            distinctId: userId ?? undefined,
            parameters: input,
            durationMs: Date.now() - start,
            isError: thrown !== undefined || result?.isError === true,
            error: thrown !== undefined
              ? { message: thrown instanceof Error ? thrown.message : String(thrown) }
              : result?.isError
                ? { message: result?.content?.[0]?.text ?? "Tool returned an error" }
                : undefined,
            properties: { $mcp_server_name: "gemiq-hub-mcp", app: "gemiq_hub" },
          });
          await ph.flush();
        }
      } catch (e) {
        console.error("[mcp analytics]", e);
      }
    }
  };
  return { ...tool, handler } as unknown as T;
}
