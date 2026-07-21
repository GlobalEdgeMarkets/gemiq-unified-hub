import { createFileRoute } from "@tanstack/react-router";
import { stripe } from "@/lib/hub/stripe";
import { isHubSubscription, syncSubscription } from "@/lib/hub/subscription-sync.server";
import type Stripe from "stripe";

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
