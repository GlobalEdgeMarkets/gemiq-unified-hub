// Deferred, idempotent HubSpot property bootstrap.
// NOT called during initial build. Invoke manually with x-job-secret when ready,
// or from the gated /admin console (same shared implementation).
// Auth: x-job-secret header must match JOB_SECRET.
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/hub/http";
import { runBootstrapHubspotSchema } from "@/lib/hub/admin/hubspot-bootstrap.server";

export const Route = createFileRoute("/api/public/admin/bootstrap-hubspot-schema")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-job-secret");
        if (!secret || secret !== process.env.JOB_SECRET) return new Response("forbidden", { status: 403 });
        return json(await runBootstrapHubspotSchema(), undefined, request);
      },
    },
  },
});
