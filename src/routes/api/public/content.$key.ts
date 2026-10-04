import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders } from "@/lib/hub/http";

/**
 * GET /api/public/content/<assessment key>
 * Published questions, weights, tiers and tier recommendations for one IQ.
 * Public by design (it's the same content any visitor sees in the assessment).
 * 404 { version: null } when the Hub has no published content yet — the app
 * keeps using its built-in questions.
 */
export const Route = createFileRoute("/api/public/content/$key")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      GET: async ({ request, params }) => {
        const key = String(params.key).toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const headers = { ...corsHeaders(request), "Content-Type": "application/json", "Cache-Control": "public, max-age=60" };
        try {
          const { publishedFor } = await import("@/lib/hub/content.server");
          const row = await publishedFor(key);
          if (!row) return new Response(JSON.stringify({ key, version: null }), { status: 404, headers });
          const etag = `"${key}-v${row.version}"`;
          if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
          return new Response(
            JSON.stringify({ key, version: row.version, published_at: row.published_at, content: row.body }),
            { status: 200, headers: { ...headers, ETag: etag } },
          );
        } catch (e) {
          console.error("[content] public read failed", e);
          return new Response(JSON.stringify({ key, version: null, error: "unavailable" }), { status: 503, headers });
        }
      },
    },
  },
});
