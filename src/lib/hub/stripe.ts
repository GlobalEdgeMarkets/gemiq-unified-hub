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

/**
 * Recurring plans (Growth / Complete) come from the manifest. Prices are
 * created on first use so the catalog self-heals across Stripe environments.
 */
import manifest from "./manifest.json";

type ManifestPlan = (typeof manifest.pricing.plans)[number];

export const PLAN_LOOKUP_KEYS = new Set(manifest.pricing.plans.map((p) => p.lookup_key));

export function planByLookupKey(lookupKey: string | null | undefined): ManifestPlan | undefined {
  return manifest.pricing.plans.find((p) => p.lookup_key === lookupKey);
}

const PRODUCT_COPY: Record<string, { name: string; description: string }> = {
  growth: { name: "GEM.IQ Growth", description: "Three GEM.IQ assessments of your choice plus the combined GEM.IQ report." },
  complete: { name: "GEM.IQ Complete", description: "Every GEM.IQ assessment, the combined report and quarterly retakes with progress tracking." },
};

export async function ensurePlanPrice(lookupKey: string): Promise<Stripe.Price> {
  const plan = planByLookupKey(lookupKey);
  if (!plan) throw new Error(`Unknown plan ${lookupKey}`);
  const s = stripe();
  const existing = await s.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0] && existing.data[0].unit_amount === plan.amount * 100) return existing.data[0];

  const tier = plan.tier ?? "complete";
  const found = await s.products.search({
    query: `active:'true' AND metadata['gemiq_sku']:'${tier}'`, limit: 1,
  }).catch(() => ({ data: [] as Stripe.Product[] }));
  const product = found.data[0] ?? await s.products.create({
    ...PRODUCT_COPY[tier],
    metadata: { gemiq_sku: tier, source: "gemiq_hub" },
  });

  const yearly = plan.interval === "year";
  return s.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.amount * 100,
    recurring: { interval: yearly ? "year" : "month", interval_count: plan.interval === "quarter" ? 3 : 1 },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { source: "gemiq_hub", kind: lookupKey, tier },
  });
}

/** One-time purchase: a single assessment, any IQ. */
export const SINGLE_ASSESSMENT_LOOKUP_KEY = "gemiq_single_assessment";
export const SINGLE_ASSESSMENT_AMOUNT = 17900; // $179.00 USD

/**
 * Resolve the one-time single-assessment price, creating the product/price on
 * first use so the catalog self-heals across Stripe environments.
 */
export async function ensureSingleAssessmentPrice(): Promise<Stripe.Price> {
  const s = stripe();
  const existing = await s.prices.list({
    lookup_keys: [SINGLE_ASSESSMENT_LOOKUP_KEY], active: true, limit: 1,
  });
  if (existing.data[0]) return existing.data[0];

  const products = await s.products.search({
    query: `active:'true' AND metadata['gemiq_sku']:'single_assessment'`,
    limit: 1,
  }).catch(() => ({ data: [] as Stripe.Product[] }));

  const product = products.data[0] ?? await s.products.create({
    name: "GEM.IQ Single Assessment",
    description: "One GEM.IQ assessment of your choice, with the full dimension-level report.",
    metadata: { gemiq_sku: "single_assessment", source: "gemiq_hub" },
  });

  return s.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: SINGLE_ASSESSMENT_AMOUNT,
    lookup_key: SINGLE_ASSESSMENT_LOOKUP_KEY,
    transfer_lookup_key: true,
    metadata: { source: "gemiq_hub", kind: "single_assessment" },
  });
}

