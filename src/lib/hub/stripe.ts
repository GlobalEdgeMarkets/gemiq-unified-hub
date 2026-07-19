import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" as any });
  }
  return _stripe;
}

/** Resolve a Stripe Price by its lookup_key. */
export async function priceByLookupKey(lookupKey: string): Promise<Stripe.Price> {
  const list = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (!list.data[0]) throw new Error(`No active Stripe price for lookup_key=${lookupKey}`);
  return list.data[0];
}
