// TEMPORARY one-off maintenance endpoint. Delete after use.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/admin/run-3b8f60d1c7")({
  server: {
    handlers: {
      GET: async () => {
        const out: Record<string, unknown> = {};
        try {
          const { runBootstrapHubspotSchema } = await import("@/lib/hub/admin/hubspot-bootstrap.server");
          out.bootstrap = await runBootstrapHubspotSchema();
        } catch (e) {
          out.bootstrap_error = String((e as Error)?.stack ?? e);
        }
        try {
          const { runPreflight } = await import("@/lib/hub/admin/status.server");
          out.preflight = await runPreflight();
        } catch (e) {
          out.preflight_error = String((e as Error)?.stack ?? e);
        }
        try {
          const { readContactProperty } = await import("@/lib/hub/admin/hubspot-bootstrap.server");
          const tiers: Record<string, unknown> = {};
          for (const n of ["gem_tariff_tier", "gem_readiness_tier", "gem_ux_tier", "gem_techsvc_tier", "gem_gtm_tier", "gem_sales_tier", "gem_product_tier", "gem_aitransform_tier"]) {
            const r = (await readContactProperty(n)) as { property?: { options?: { value: string }[] } };
            tiers[n] = r?.property?.options?.map(o => o.value) ?? r;
          }
          out.tier_options = tiers;
        } catch (e) {
          out.tier_error = String((e as Error)?.stack ?? e);
        }
        return new Response(JSON.stringify(out, null, 2), { status: 200, headers: { "content-type": "application/json" } });
      },
    },
  },
});
