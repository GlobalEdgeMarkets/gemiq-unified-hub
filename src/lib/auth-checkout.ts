/** Only a repeat trial request may bypass checkout for an existing subscriber (legacy, flow off). */
export function shouldCheckExistingTrial(search: { buy?: "single"; trial?: string }, safeReturn: string | null): boolean {
  return !safeReturn && search.buy !== "single" && search.trial === "1";
}

export type Intent = "signin" | "trial" | "plan" | "single" | "unlock";
export type PlanState = "none" | "trialing" | "active";
export type Step =
  | { kind: "return" }                                  // go to checked return address (or dashboard)
  | { kind: "dashboard" }
  | { kind: "checkout"; trial: boolean; single: boolean } // Hub checkout, then finishing step
  | { kind: "picker" };                                 // /unlock plan choice

export function intentOf(s: { trial?: string; plan?: string; buy?: string }): Intent {
  if (s.buy === "single") return "single";
  if (s.trial === "1") return "trial";
  if (s.plan) return "plan";
  return "signin";
}

/** What happens once a person is signed in. `flowOn` false = behaviour before item 2. */
export function nextStep(intent: Intent, plan: PlanState, hasReturn: boolean, flowOn: boolean): Step {
  if (intent === "signin") return { kind: "return" };
  if (!flowOn) {
    if (hasReturn) return { kind: "return" };
    if (intent === "trial" && plan !== "none") return { kind: "dashboard" };
    if (intent === "unlock") return plan === "active" ? { kind: "return" } : { kind: "checkout", trial: false, single: false };
    return { kind: "checkout", trial: intent === "trial", single: intent === "single" };
  }
  switch (intent) {
    case "single": return { kind: "checkout", trial: false, single: true };
    case "trial": return plan === "none" ? { kind: "checkout", trial: true, single: false } : plan === "trialing" ? { kind: "picker" } : { kind: "return" };
    case "plan": return plan === "active" && hasReturn ? { kind: "return" } : { kind: "checkout", trial: false, single: false };
    case "unlock": return plan === "active" ? { kind: "return" } : { kind: "picker" };
  }
}

export function planStateOf(sub: { active?: boolean; trialing?: boolean } | null | undefined): PlanState {
  if (!sub?.active) return "none";
  return sub.trialing ? "trialing" : "active";
}
