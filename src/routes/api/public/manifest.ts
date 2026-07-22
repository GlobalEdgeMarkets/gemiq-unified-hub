import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders } from "@/lib/hub/http";
import manifest from "@/lib/hub/manifest.json";

/**
 * GET /api/public/manifest
 *
 * Canonical, cache-friendly source of truth for every IQ (TariffIQ,
 * ReadinessIQ, UXIQ, TechServicesIQ, ...). IQs poll this endpoint on a
 * schedule (or on app boot) and reconcile local brand, pricing, deep
 * links, and SDK version against it. See @gemiq/hub-sdk `hub.manifest`
 * for the recommended client integration.
 *
 * Response shape:
 *   {
 *     version: "1.0.0",                       // semver — bump on any change
 *     etag: "\"<hash>\"",                     // strong etag over the payload
 *     served_at: "2026-07-22T12:00:00.000Z",
 *     hub: {...}, brand: {...}, pricing: {...}, assessments: [...], deep_links: {...}
 *   }
 *
 * Supports `If-None-Match` for 304 responses so pollers stay cheap.
 */

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: corsHeaders(request) }),

      GET: async ({ request }) => {
        const body = JSON.stringify(manifest);
        const hash = (await sha256Hex(body)).slice(0, 16);
        const etag = `"${manifest.version}-${hash}"`;
        const ifNoneMatch = request.headers.get("if-none-match");

        const baseHeaders: Record<string, string> = {
          ...corsHeaders(request),
          "content-type": "application/json; charset=utf-8",
          etag,
          "cache-control": "public, max-age=60, stale-while-revalidate=600",
          "x-manifest-version": manifest.version,
        };

        if (ifNoneMatch && ifNoneMatch === etag) {
          return new Response(null, { status: 304, headers: baseHeaders });
        }

        const payload = JSON.stringify({
          ...manifest,
          etag,
          served_at: new Date().toISOString(),
        });

        return new Response(payload, { status: 200, headers: baseHeaders });
      },
    },
  },
});
