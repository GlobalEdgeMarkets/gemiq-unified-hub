import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/hub/http";

// Deletes test contacts older than the keep period (test addresses only).
export const Route = createFileRoute("/api/public/e2e/cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { secretOk, cleanup } = await import("@/lib/hub/e2e/e2e.server");
        if (!secretOk(request)) return new Response("forbidden", { status: 403 });
        return json(await cleanup({ max: 10 }), undefined, request);
      },
    },
  },
});
