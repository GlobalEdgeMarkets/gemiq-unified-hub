import { createFileRoute } from "@tanstack/react-router";
import { accountRedirectTarget } from "@/lib/account-redirect";

// Legacy manifest `portal` address. IQs that bundle an older manifest still link here.
export const Route = createFileRoute("/account")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(null, { status: 301, headers: { Location: accountRedirectTarget(request.url) } }),
    },
  },
});
