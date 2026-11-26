import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/hub/http";

export function authorizedJob(req: Request, secret = process.env.JOB_SECRET): boolean {
  const given = req.headers.get("x-job-secret") ?? new URL(req.url).searchParams.get("secret");
  return !!secret && !!given && given === secret;
}

export const Route = createFileRoute("/api/public/jobs/retry-hubspot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorizedJob(request)) return new Response("forbidden", { status: 403 });
        // Once a day: remove old end-to-end test contacts (test addresses only).
        await import("@/lib/hub/e2e/e2e.server")
          .then((m) => m.maybeDailyCleanup())
          .catch((e) => console.error("[retry] e2e cleanup failed", e));
        const { runHubspotRetry } = await import("@/lib/hub/hubspot-retry.server");
        return json(await runHubspotRetry(), undefined, request);
      },
    },
  },
});
