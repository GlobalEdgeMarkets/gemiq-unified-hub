import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR } from "@/lib/hub/supabase-server";
import { stripe } from "@/lib/hub/stripe";
import { json, corsHeaders } from "@/lib/hub/http";
import { z } from "zod";

const Body = z.object({ return_url: z.string().url() });

export const Route = createFileRoute("/api/public/billing/create-portal-session")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return json({ error: "not_authenticated" }, { status: 401 });

        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_body" }, { status: 400 });

        const s = stripe();
        const customers = await s.customers.list({ email: user.email, limit: 1 });
        if (!customers.data[0]) return json({ error: "no_customer" }, { status: 404 });

        const portal = await s.billingPortal.sessions.create({
          customer: customers.data[0].id,
          return_url: parsed.data.return_url,
        });
        return json({ url: portal.url });
      },
    },
  },
});
