import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json } from "@/lib/hub/http";

// Checkly calls this first: creates a fresh confirmed test account on a trial.
export const Route = createFileRoute("/api/public/e2e/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { secretOk, startCheckly } = await import("@/lib/hub/e2e/e2e.server");
        if (!secretOk(request)) return new Response("forbidden", { status: 403 });
        const parsed = z.object({ assessment_key: z.string().regex(/^[a-z0-9]{2,32}$/) })
          .safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_payload" }, { status: 400 }, request);
        try {
          return json(await startCheckly(parsed.data.assessment_key), undefined, request);
        } catch (e) {
          console.error("[e2e/start]", e);
          return json({ error: (e as Error).message }, { status: 400 }, request);
        }
      },
    },
  },
});
