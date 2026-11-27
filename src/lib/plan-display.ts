/** Client-safe display helpers for the /unlock plan picker. Every value comes from manifest pricing. */
export interface DisplayPlan {
  lookup_key: string; name: string; amount: number; interval: string;
  tier?: string; includes?: string[]; recommended?: boolean;
}

/** Currency-aware money with thousands separators; whole amounts show no decimals. */
export function formatMoney(amount: number, currency = "USD"): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency,
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return amount.toLocaleString("en-US");
  }
}

/** Yearly saving vs 12 × the same tier's monthly plan; null when no match or no saving. */
export function annualSaving(plan: DisplayPlan, plans: DisplayPlan[]): { amount: number; monthsFree: number | null } | null {
  if (plan.interval !== "year" || !plan.tier) return null;
  const monthly = plans.find((p) => p.tier === plan.tier && p.interval === "month");
  if (!monthly || !(monthly.amount > 0)) return null;
  const amount = 12 * monthly.amount - plan.amount;
  if (!(amount > 0)) return null;
  const months = amount / monthly.amount;
  return { amount, monthsFree: Number.isInteger(months) ? months : null };
}

/** Back link: the already-checked return address, else the dashboard. */
export function backLink(checkedReturn: string | null | undefined): { href: string; label: string } {
  return checkedReturn ? { href: checkedReturn, label: "Back to my report" } : { href: "/dashboard", label: "Back" };
}
