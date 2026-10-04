import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders } from "@/lib/hub/http";
import manifest from "@/lib/hub/manifest.json";

/**
 * GET /api/public/manifest
 *
 * Canonical, cache-friendly source of truth for the six live IQs — GTMIQ,
 * SalesIQ, ProductIQ, AITransformIQ, UXIQ (capability diagnostics) and
 * TariffIQ (specialist diagnostics). Each assessment carries a `track`, and
 * the top-level `tracks` object supplies the label/blurb for each so IQs can
 * render the split without hardcoding copy. IQs poll this endpoint on a
 * schedule (or on app boot) and reconcile local brand, pricing, deep links,
 * and SDK version against it. See @gemiq/hub-sdk `hub.manifest` for the
 * recommended client integration.
 *
 * Response shape:
 *   {
 *     version: "1.6.0",                       // semver — bump on any change
 *     etag: "\"<hash>\"",                     // strong etag over the payload
 *     served_at: "2026-09-15T12:00:00.000Z",
 *     hub: {...}, brand: {...}, pricing: {...}, tracks: {...},
 *     assessments: [{ key, name, url, track }, ...], deep_links: {...}
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
        // Live control values (notices, pause switches, editable wording) are
        // merged over the static manifest; static values win if the DB is down.
        const { getPublicControl } = await import("@/lib/hub/app-control.server");
        const { getPublicReport } = await import("@/lib/hub/report-control.server");
        const { publishedVersions } = await import("@/lib/hub/content.server");
        const [control, report, contentVersions] = await Promise.all([
          getPublicControl(),
          getPublicReport(manifest.assessments.map((a) => a.key)),
          publishedVersions().catch(() => null),
        ]);
        const pricing = { ...manifest.pricing, copy: { ...manifest.pricing.copy } };
        if (control) {
          for (const [k, v] of Object.entries(control.copy)) {
            if (v) (pricing.copy as Record<string, string>)[k] = v;
          }
        }
        const merged = {
          ...manifest,
          pricing,
          control: control
            ? { global: control.global, apps: control.apps }
            : { global: { notice: null, notice_level: "info" }, apps: {} },
          // Live report settings; null when the DB is unreachable (IQs keep their last copy).
          report,
          // Published Hub content version per IQ (null = none published; keep built-in questions).
          content: contentVersions
            ? Object.fromEntries(manifest.assessments.map((a) => [a.key, contentVersions[a.key] ?? null]))
            : null,
        };
        const body = JSON.stringify(merged);
        const hash = (await sha256Hex(body)).slice(0, 16);
        const etag = `"${manifest.version}-${hash}"`;
        const ifNoneMatch = request.headers.get("if-none-match");

        const baseHeaders: Record<string, string> = {
          ...corsHeaders(request),
          "content-type": "application/json; charset=utf-8",
          etag,
          "cache-control": "public, max-age=60, stale-while-revalidate=300",
          "x-manifest-version": manifest.version,
        };

        if (ifNoneMatch && ifNoneMatch === etag) {
          return new Response(null, { status: 304, headers: baseHeaders });
        }

        const payload = JSON.stringify({
          ...merged,
          etag,
          served_at: new Date().toISOString(),
        });

        return new Response(payload, { status: 200, headers: baseHeaders });
      },
    },
  },
});
