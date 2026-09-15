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

type Plan = (typeof PRICING.plans)[number];

const MONTHS_IN: Record<PlanInterval, number> = { month: 1, quarter: 3, year: 12 };

const PLANS: Plan[] = Array.isArray(PRICING.plans) ? PRICING.plans : [];

/** Exact match only. Returns undefined when the manifest has no such plan. */
export function findPlan(interval: PlanInterval): Plan | undefined {
  return PLANS.find((p) => p.interval === interval);
}

/** True when the manifest actually ships this interval. Drive UI off this. */
export function hasPlan(interval: PlanInterval): boolean {
  return findPlan(interval) !== undefined;
}

/**
 * NOT FOR DISPLAY. Returns the exact plan when present, otherwise the nearest
 * available term by length. Only for logic that needs *a* plan to point at
 * (e.g. a default checkout term). Never render its amount under another
 * term's label — use `priceFor`, which is exact-match only.
 */
export function planFor(interval: PlanInterval): Plan | undefined {
  const exact = findPlan(interval);
  if (exact) return exact;
  const want = MONTHS_IN[interval];
  const candidates = PLANS.filter((p) => p.interval in MONTHS_IN);
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, p) =>
    Math.abs(MONTHS_IN[p.interval as PlanInterval] - want) <
    Math.abs(MONTHS_IN[best.interval as PlanInterval] - want)
      ? p
      : best,
  );
}

/**
 * Formatted price for exactly this interval. Undefined when the manifest has
 * no such plan — callers hide the whole clause. Never substitutes another term.
 */
export function priceFor(interval: PlanInterval): string | undefined {
  const plan = findPlan(interval);
  return plan ? money(plan.amount) : undefined;
}


export const ONE_TIME = PRICING.one_time;
export const ONE_TIME_PRICE = ONE_TIME ? money(ONE_TIME.amount) : undefined;

export const MONTHLY = findPlan("month");
export const QUARTERLY = findPlan("quarter");
export const ANNUAL = findPlan("year");

export const MONTHLY_PRICE = priceFor("month");
export const QUARTERLY_PRICE = priceFor("quarter");
export const ANNUAL_PRICE = priceFor("year");

/** "≈ $93 / mo" style effective monthly rate for multi-month terms. */
export function effectiveMonthly(interval: PlanInterval): string | undefined {
  const months = MONTHS_IN[interval];
  if (months === 1) return undefined;
  const plan = findPlan(interval);
  if (!plan) return undefined;
  return `≈ ${money(Math.round(plan.amount / months))} / mo`;
}

/**
 * Discount of a multi-month term against paying monthly, computed from the
 * manifest amounts so the label cannot go stale on a price change.
 * Returns undefined when either plan is missing or there is no saving.
 */
export function savingsAgainstMonthly(
  interval: PlanInterval,
): { percent: number; monthsFree: number } | undefined {
  const monthly = findPlan("month");
  const plan = findPlan(interval);
  if (!monthly || !plan || monthly.amount <= 0) return undefined;
  const months = MONTHS_IN[interval];
  if (months === 1) return undefined;
  const full = monthly.amount * months;
  if (plan.amount >= full) return undefined;
  return {
    percent: Math.round(((full - plan.amount) / full) * 100),
    // Floor, never round: a half-month saving must not advertise a whole month.
    monthsFree: Math.floor((full - plan.amount) / monthly.amount),

  };
}

/** Short label suffix: "save 6%" / "2 months free" / undefined. */
export function savingsLabel(interval: PlanInterval): string | undefined {
  const s = savingsAgainstMonthly(interval);
  if (!s) return undefined;
  if (s.monthsFree >= 1) {
    return `${s.monthsFree} month${s.monthsFree === 1 ? "" : "s"} free`;
  }
  return s.percent > 0 ? `save ${s.percent}%` : undefined;
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

