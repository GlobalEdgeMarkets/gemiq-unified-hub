/**
 * Derived pricing display helpers.
 *
 * PLAYBOOK §5/§7: no surface may restate a price. Everything here is read from
 * src/lib/hub/manifest.json (read-only import) so a manifest change reaches the
 * Hub's own marketing pages without another edit.
 *
 * Resilience rule: nothing in this module throws, and nothing throws at module
 * scope. A manifest that ships without one of month/quarter/year must cost a
 * price line, never the whole page — the Hub still renders, the missing plan is
 * simply not offered.
 */
import manifest from "@/lib/hub/manifest.json";

export const PRICING = manifest.pricing;

const CURRENCY_PREFIX = PRICING.currency === "USD" ? "$" : "";

export function money(amount: number): string {
  return `${CURRENCY_PREFIX}${amount}`;
}

export type PlanInterval = "month" | "quarter" | "year";
export type PlanTier = "growth" | "complete";

type Plan = (typeof PRICING.plans)[number];

const MONTHS_IN: Record<PlanInterval, number> = { month: 1, quarter: 3, year: 12 };

const PLANS: Plan[] = Array.isArray(PRICING.plans) ? PRICING.plans : [];

/** Exact match only. Undefined when the manifest has no such plan. */
export function findPlan(tier: PlanTier, interval: PlanInterval): Plan | undefined {
  return PLANS.find((p) => p.tier === tier && p.interval === interval);
}

/** Formatted price for exactly this plan, or undefined (callers hide the clause). */
export function priceFor(tier: PlanTier, interval: PlanInterval): string | undefined {
  const plan = findPlan(tier, interval);
  return plan ? money(plan.amount) : undefined;
}

export const ONE_TIME = PRICING.one_time;
export const ONE_TIME_PRICE = ONE_TIME ? money(ONE_TIME.amount) : undefined;

export const GROWTH = findPlan("growth", "month");
export const GROWTH_PRICE = priceFor("growth", "month");
export const GROWTH_PICKS = GROWTH?.assessments_included ?? 3;
export const COMPLETE_MONTHLY = findPlan("complete", "month");
export const COMPLETE_ANNUAL = findPlan("complete", "year");
export const COMPLETE_MONTHLY_PRICE = priceFor("complete", "month");
export const COMPLETE_ANNUAL_PRICE = priceFor("complete", "year");

/** "≈ $208 / mo" effective rate for a multi-month term. */
export function effectiveMonthly(tier: PlanTier, interval: PlanInterval): string | undefined {
  const months = MONTHS_IN[interval];
  const plan = findPlan(tier, interval);
  if (months === 1 || !plan) return undefined;
  return `≈ ${money(Math.round(plan.amount / months))} / mo`;
}

/** "2 months free" / "save 6%" against the same tier's monthly price, computed from the manifest. */
export function savingsLabel(tier: PlanTier, interval: PlanInterval): string | undefined {
  const monthly = findPlan(tier, "month");
  const plan = findPlan(tier, interval);
  const months = MONTHS_IN[interval];
  if (!monthly || !plan || months === 1 || monthly.amount <= 0) return undefined;
  const full = monthly.amount * months;
  if (plan.amount >= full) return undefined;
  // Floor, never round: a half-month saving must not advertise a whole month.
  const free = Math.floor((full - plan.amount) / monthly.amount);
  if (free >= 1) return `${free} month${free === 1 ? "" : "s"} free`;
  const pct = Math.round(((full - plan.amount) / full) * 100);
  return pct > 0 ? `save ${pct}%` : undefined;
}

export const TRIAL_DAYS = PRICING.trial?.days;
export const GUARANTEE_DAYS = PRICING.guarantee?.days;

/**
 * Ready-made phrases. A CTA cannot disappear, so the trial label degrades to
 * "free trial" when the manifest ships no day count. The guarantee phrase is
 * undefined when absent — callers drop the whole clause.
 */
export const TRIAL_LABEL = TRIAL_DAYS ? `${TRIAL_DAYS}-day trial` : "free trial";
export const TRIAL_PHRASE = TRIAL_DAYS ? `${TRIAL_DAYS}-day free trial` : "free trial";
export const GUARANTEE_LABEL = GUARANTEE_DAYS
  ? `${GUARANTEE_DAYS}-day money-back guarantee`
  : undefined;

