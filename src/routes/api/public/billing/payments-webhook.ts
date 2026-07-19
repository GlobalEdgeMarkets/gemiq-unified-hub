import { createFileRoute } from "@tanstack/react-router";
import { stripe } from "@/lib/hub/stripe";
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import type Stripe from "stripe";

const HUB_LOOKUP_KEYS = new Set(["gemiq_professional_monthly", "gemiq_professional_annual"]);

/** True iff this subscription was created by the GEM.IQ hub. */
function isHubSubscription(sub: Stripe.Subscription): boolean {
  if (sub.metadata?.source === "gemiq_hub") return true;
  const lk = sub.items?.data?.[0]?.price?.lookup_key;
  if (lk && HUB_LOOKUP_KEYS.has(lk)) return true;
  return false;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const svc = createHubServiceClient();
  const price = sub.items.data[0]?.price;
  const userId = (sub.metadata?.supabase_user_id as string | undefined) ?? await resolveUserIdFromCustomer(sub.customer as string);
  if (!userId) return;
  await svc.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: price?.id ?? null,
    lookup_key: price?.lookup_key ?? null,
    status: sub.status,
    current_period_end: new Date(((sub as any).current_period_end ?? 0) * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  }, { onConflict: "stripe_subscription_id" });
}

async function resolveUserIdFromCustomer(customerId: string): Promise<string | null> {
  const c = await stripe().customers.retrieve(customerId);
  if (c.deleted) return null;
  const meta = (c as Stripe.Customer).metadata?.supabase_user_id;
  if (meta) return meta;
  const email = (c as Stripe.Customer).email;
  if (!email) return null;
  const svc = createHubServiceClient();
  const { data } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

export const Route = createFileRoute("/api/public/billing/payments-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("stripe-signature");
        if (!sig) return new Response("missing signature", { status: 400 });
        const raw = await request.text();
        let event: Stripe.Event;
        try {
          event = await stripe().webhooks.constructEventAsync(
            raw, sig, process.env.STRIPE_WEBHOOK_SECRET!,
          );
        } catch (e: any) {
          return new Response(`invalid signature: ${e.message}`, { status: 400 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              // Only subscription-mode checkouts owned by the hub.
              const ownedByHub =
                s.mode === "subscription" &&
                (s.metadata?.source === "gemiq_hub" || !!s.client_reference_id);
              if (!ownedByHub || !s.subscription) {
                console.log("[stripe webhook] ignored non-gemiq event", event.type, event.id);
                break;
              }
              const sub = await stripe().subscriptions.retrieve(s.subscription as string);
              // Backfill metadata on the sub so later events pass isHubSubscription.
              const patch: Record<string, string> = {};
              if (!sub.metadata?.source) patch.source = "gemiq_hub";
              const uid = (s.metadata?.supabase_user_id as string | undefined) ?? s.client_reference_id ?? undefined;
              if (uid && !sub.metadata?.supabase_user_id) patch.supabase_user_id = uid;
              if (Object.keys(patch).length) {
                await stripe().subscriptions.update(sub.id, { metadata: { ...(sub.metadata ?? {}), ...patch } });
                sub.metadata = { ...(sub.metadata ?? {}), ...patch };
              }
              if (!isHubSubscription(sub)) {
                console.log("[stripe webhook] ignored non-gemiq event", event.type, event.id);
                break;
              }
              await syncSubscription(sub);
              break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              if (!isHubSubscription(sub)) {
                console.log("[stripe webhook] ignored non-gemiq event", event.type, event.id);
                break;
              }
              await syncSubscription(sub);
              break;
            }
            case "invoice.payment_succeeded":
            case "invoice.payment_failed": {
              const inv = event.data.object as Stripe.Invoice & { subscription?: string | null };
              if (!inv.subscription) {
                // One-off invoices (e.g. HubSpot-issued) are not hub-owned.
                console.log("[stripe webhook] ignored non-gemiq event", event.type, event.id);
                break;
              }
              const sub = await stripe().subscriptions.retrieve(inv.subscription);
              if (!isHubSubscription(sub)) {
                console.log("[stripe webhook] ignored non-gemiq event", event.type, event.id);
                break;
              }
              await syncSubscription(sub);
              break;
            }
          }
        } catch (e: any) {
          console.error("[stripe webhook]", event.type, e);
          return new Response(`handler error: ${e.message}`, { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
