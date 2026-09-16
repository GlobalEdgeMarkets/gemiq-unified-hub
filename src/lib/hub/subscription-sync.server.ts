import type Stripe from "stripe";
import { createHubServiceClient } from "./supabase-server";
import { stripe } from "./stripe";

export const HUB_LOOKUP_KEYS = new Set([
  "gemiq_professional_monthly",
  "gemiq_professional_quarterly",
  "gemiq_professional_annual",
]);

export function isHubSubscription(sub: Stripe.Subscription): boolean {
  if (sub.metadata?.source === "gemiq_hub") return true;
  const lookupKey = sub.items.data[0]?.price?.lookup_key;
  return !!lookupKey && HUB_LOOKUP_KEYS.has(lookupKey);
}

async function resolveUserIdFromCustomer(customerId: string): Promise<string | null> {
  const customer = await stripe().customers.retrieve(customerId);
  if (customer.deleted) return null;
  if (customer.metadata?.supabase_user_id) return customer.metadata.supabase_user_id;
  if (!customer.email) return null;

  // `profiles.email` has no unique constraint, so this can legitimately return
  // more than one row. Tie-break: oldest profile wins (the original account for
  // that email); duplicates are later accidents. Never throw here — a webhook
  // must not 500 over a data-shape surprise and trigger Stripe retries.
  const service = createHubServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("id")
    .eq("email", customer.email)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) {
    console.error("[subscription sync] profile lookup failed", error);
    return null;
  }
  return data?.[0]?.id ?? null;

}

export async function syncSubscription(sub: Stripe.Subscription, knownUserId?: string) {
  const userId = knownUserId
    ?? sub.metadata?.supabase_user_id
    ?? await resolveUserIdFromCustomer(sub.customer as string);
  if (!userId) return false;

  const price = sub.items.data[0]?.price;
  const periodEnd = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const trialEnd = (sub as Stripe.Subscription & { trial_end?: number | null }).trial_end;
  const service = createHubServiceClient();
  const { error } = await service.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_price_id: price?.id ?? null,
    lookup_key: price?.lookup_key ?? null,
    status: sub.status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  }, { onConflict: "stripe_subscription_id" });
  if (error) throw error;
  return true;
}

/** Recover subscription state directly from Stripe when webhook delivery lags or fails. */
export async function reconcileSubscriptionForUser(userId: string, email: string) {
  const customers = await stripe().customers.list({ email, limit: 10 });
  const subscriptions: Stripe.Subscription[] = [];

  for (const customer of customers.data) {
    const list = await stripe().subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
      expand: ["data.items.data.price"],
    });
    subscriptions.push(...list.data.filter(isHubSubscription));
  }

  subscriptions.sort((a, b) => b.created - a.created);
  const preferred = subscriptions.find((sub) => ["active", "trialing"].includes(sub.status))
    ?? subscriptions[0];
  if (!preferred) return null;

  await syncSubscription(preferred, userId);
  return preferred;
}