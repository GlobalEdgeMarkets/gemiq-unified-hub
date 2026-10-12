import { createFileRoute } from "@tanstack/react-router";
import { PROPERTIES, isMessagingOriginAllowed, publicPayload, type MessagingBody, type Property } from "@/lib/messaging";

/**
 * GET /api/public/messaging?property=globaledgemarkets.com|gemiq|globaledgetalk
 * Published brand wording for one property: Shared + own items (own wins), Approved only.
 * Read-only, no auth; writes happen only in Admin → Brand → Messaging.
 */
function cors(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const extra = (process.env.MESSAGING_EXTRA_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "content-type,if-none-match",
    "Access-Control-Expose-Headers": "etag",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && isMessagingOriginAllowed(origin, extra)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

async function sha(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/messaging")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: cors(request) }),
      GET: async ({ request }) => {
        const headers = { ...cors(request), "content-type": "application/json; charset=utf-8" };
        const property = new URL(request.url).searchParams.get("property") ?? "";
        if (!(PROPERTIES as readonly string[]).includes(property)) {
          return new Response(JSON.stringify({ error: "unknown_property", allowed: PROPERTIES }), { status: 400, headers });
        }
        const { publishedVersion } = await import("@/lib/hub/messaging.server");
        const live = await publishedVersion().catch(() => null);
        if (!live) return new Response(JSON.stringify({ error: "not_published" }), { status: 404, headers: { ...headers, "cache-control": "public, max-age=60" } });
        const payload = publicPayload(live.body as MessagingBody, property as Property, live.version, live.published_at);
        const body = JSON.stringify(payload);
        const etag = `"m${live.version}-${await sha(body)}"`;
        const all = { ...headers, etag, "cache-control": "public, max-age=300, stale-while-revalidate=600" };
        if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: all });
        return new Response(body, { status: 200, headers: all });
      },
    },
  },
});
