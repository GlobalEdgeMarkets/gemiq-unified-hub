import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/hub/http";

// Checkly polls this after submitting: returns pass / fail / running with each check.
export const Route = createFileRoute("/api/public/e2e/check/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { secretOk, checkRun } = await import("@/lib/hub/e2e/e2e.server");
        if (!secretOk(request)) return new Response("forbidden", { status: 403 });
        if (!/^[0-9a-f-]{36}$/.test(params.id)) return json({ error: "invalid_id" }, { status: 400 }, request);
        try {
          const run = await checkRun(params.id);
          return json({ status: run.status, assessment_key: run.assessment_key, checks: run.checks }, undefined, request);
        } catch (e) {
          console.error("[e2e/check]", e);
          return json({ error: (e as Error).message }, { status: 400 }, request);
        }
      },
    },
  },
});
