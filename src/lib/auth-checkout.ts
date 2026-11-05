/** Only a repeat trial request may bypass checkout for an existing subscriber. */
export function shouldCheckExistingTrial(search: { buy?: "single"; trial?: string }, safeReturn: string | null): boolean {
  return !safeReturn && search.buy !== "single" && search.trial === "1";
}