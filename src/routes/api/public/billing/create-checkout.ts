import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR } from "@/lib/hub/supabase-server";
import { stripe, priceByLookupKey } from "@/lib/hub/stripe";
import { json, corsHeaders } from "@/lib/hub/http";
import { z } from "zod";

const Body = z.object({
  lookup_key: z.string().min(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  /** Enable a 7-day trial with 1 free assessment across any IQ. Card is still required. */
  trial: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/billing/create-checkout")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => new Response(null, { status: 204, headers: corsHeaders(request) }),
      POST: async ({ request }) => {
        const setCookies: string[] = [];
        const supabase = createHubSupabaseSSR(request, setCookies);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) return json({ error: "not_authenticated" }, { status: 401 }, request);

        const parsed = Body.safeParse(await request.json().catch(() => ({})));
        if (!parsed.success) return json({ error: "invalid_body", issues: parsed.error.issues }, { status: 400 }, request);

        const price = await priceByLookupKey(parsed.data.lookup_key);
        const s = stripe();

        // find or create customer
        const existing = await s.customers.list({ email: user.email, limit: 1 });
        const customerId = existing.data[0]?.id
          ?? (await s.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })).id;

        const session = await s.checkout.sessions.create({
          mode: "subscription",
          customer: customerId,
          client_reference_id: user.id,
          line_items: [{ price: price.id, quantity: 1 }],
          success_url: parsed.data.success_url,
          cancel_url: parsed.data.cancel_url,
          allow_promotion_codes: true,
          metadata: { source: "gemiq_hub", supabase_user_id: user.id, lookup_key: parsed.data.lookup_key },
          subscription_data: {
            metadata: { source: "gemiq_hub", supabase_user_id: user.id, lookup_key: parsed.data.lookup_key },
          },
        });
        return json({ url: session.url, id: session.id }, undefined, request);
      },
    },
  },
});
