// ONE PLACE for old/short plan names used in links (?plan=...). Change here only.
// Values are Stripe lookup keys from manifest pricing. Any manifest lookup_key is also
// accepted directly, so new plans work without touching this map.
import manifest from "@/lib/hub/manifest.json";

export const PLAN_ALIASES: Record<string, string> = {
  monthly: "gemiq_complete_monthly",
  quarterly: "gemiq_complete_monthly",
  annual: "gemiq_complete_annual",
  growth: "gemiq_growth_monthly",
  complete: "gemiq_complete_monthly",
  complete_annual: "gemiq_complete_annual",
};
/** Plan used when a trial link names no plan. */
export const DEFAULT_TRIAL_PLAN = "gemiq_complete_monthly";

export function resolvePlan(name: unknown, plans = manifest.pricing.plans as { lookup_key: string }[]): string | undefined {
  if (typeof name !== "string" || !name) return undefined;
  const key = PLAN_ALIASES[name] ?? name;
  return plans.some((p) => p.lookup_key === key) ? key : undefined;
}
