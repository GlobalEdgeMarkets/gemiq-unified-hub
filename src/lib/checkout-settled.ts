/** Finishing step is done when the plan shows trialing/active, or (single purchase) a credit exists. */
export function isCheckoutSettled(sub: { active?: boolean; credits_available?: number } | null, single: boolean): boolean {
  if (!sub) return false;
  return single ? (sub.credits_available ?? 0) > 0 : !!sub.active;
}
