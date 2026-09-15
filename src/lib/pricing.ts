/**
 * Derived pricing display helpers.
 *
 * PLAYBOOK §5/§7: no surface may restate a price. Everything here is read from
 * src/lib/hub/manifest.json (read-only import) so a manifest change reaches the
 * Hub's own marketing pages without another edit.
 */
import manifest from "@/lib/hub/manifest.json";

export const PRICING = manifest.pricing;

const CURRENCY_PREFIX = PRICING.currency === "USD" ? "$" : "";

export function money(amount: number): string {
  return `${CURRENCY_PREFIX}${amount}`;
}

export type PlanInterval = "month" | "quarter" | "year";

export function planFor(interval: PlanInterval) {
  const plan = PRICING.plans.find((p) => p.interval === interval);
  if (!plan) throw new Error(`No plan for interval ${interval}`);
  return plan;
}

export const ONE_TIME = PRICING.one_time;
export const ONE_TIME_PRICE = money(ONE_TIME.amount);

export const MONTHLY = planFor("month");
export const QUARTERLY = planFor("quarter");
export const ANNUAL = planFor("year");

export const MONTHLY_PRICE = money(MONTHLY.amount);
export const QUARTERLY_PRICE = money(QUARTERLY.amount);
export const ANNUAL_PRICE = money(ANNUAL.amount);

/** "≈ $93 / mo" style effective monthly rate for multi-month terms. */
export function effectiveMonthly(interval: PlanInterval): string | undefined {
  const months = interval === "quarter" ? 3 : interval === "year" ? 12 : 1;
  if (months === 1) return undefined;
  return `≈ ${money(Math.round(planFor(interval).amount / months))} / mo`;
}

export const TRIAL_DAYS = PRICING.trial.days;
export const GUARANTEE_DAYS = PRICING.guarantee.days;
