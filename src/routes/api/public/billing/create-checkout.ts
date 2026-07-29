import { createFileRoute } from "@tanstack/react-router";
import { createHubSupabaseSSR } from "@/lib/hub/supabase-server";
import { stripe, priceByLookupKey, ensureSingleAssessmentPrice, SINGLE_ASSESSMENT_LOOKUP_KEY } from "@/lib/hub/stripe";
import { json, corsHeaders } from "@/lib/hub/http";
import { z } from "zod";

const Body = z.object({
  lookup_key: z.string().min(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  /** Enable a 7-day trial with 1 free assessment across any IQ. Card is still required. */
  trial: z.boolean().optional(),
  /** Optional: which IQ the one-time purchase is intended for (recorded on the session). */
  assessment_key: z.string().optional(),
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

        // One-time single-assessment purchase vs. recurring suite subscription.
        const oneTime = parsed.data.lookup_key === SINGLE_ASSESSMENT_LOOKUP_KEY;
        const price = oneTime
          ? await ensureSingleAssessmentPrice()
          : await priceByLookupKey(parsed.data.lookup_key);
        const s = stripe();

        // find or create customer
        const existing = await s.customers.list({ email: user.email, limit: 1 });
        const customerId = existing.data[0]?.id
          ?? (await s.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })).id;

        const metadata: Record<string, string> = {
          source: "gemiq_hub",
          supabase_user_id: user.id,
          lookup_key: parsed.data.lookup_key,
          trial: !oneTime && parsed.data.trial ? "true" : "false",
          ...(oneTime ? { kind: "single_assessment" } : {}),
          ...(parsed.data.assessment_key ? { assessment_key: parsed.data.assessment_key } : {}),
        };

        const session = await s.checkout.sessions.create({
          mode: oneTime ? "payment" : "subscription",
          customer: customerId,
          client_reference_id: user.id,
          line_items: [{ price: price.id, quantity: 1 }],
          success_url: parsed.data.success_url,
          cancel_url: parsed.data.cancel_url,
          allow_promotion_codes: true,
          ...(oneTime
            ? { payment_intent_data: { metadata } }
            : {
                // Trial requires a card up-front so it auto-converts on day 7.
                payment_method_collection: "always" as const,
                subscription_data: {
                  ...(parsed.data.trial ? { trial_period_days: 7 } : {}),
                  metadata,
                },
              }),
          metadata,
        });
        return json({ url: session.url, id: session.id }, undefined, request);
      },
    },
  },
});

