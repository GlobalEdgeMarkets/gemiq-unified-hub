import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import { intentOf, nextStep } from "@/lib/auth-checkout";
import { isCheckoutSettled } from "@/lib/checkout-settled";
import { allowedReturnHosts, checkReturnUrl } from "@/lib/return-url";
import { resolvePlan, PLAN_ALIASES } from "@/lib/plan-aliases";
import { PlanPicker } from "@/components/checkout/PlanPicker";

const trialCo = { kind: "checkout", trial: true, single: false };
const paidCo = { kind: "checkout", trial: false, single: false };
const singleCo = { kind: "checkout", trial: false, single: true };

describe("behaviour table (flow on)", () => {
  for (const ret of [false, true]) {
    const r = ret ? "with return" : "no return";
    it(`new user / no plan, trial link, ${r} → trial checkout`, () => expect(nextStep("trial", "none", ret, true)).toEqual(trialCo));
    it(`new user, single link, ${r} → single checkout`, () => expect(nextStep("single", "none", ret, true)).toEqual(singleCo));
    it(`trial user, trial link, ${r} → picker`, () => expect(nextStep("trial", "trialing", ret, true)).toEqual({ kind: "picker" }));
    it(`trial user, unlock, ${r} → picker`, () => expect(nextStep("unlock", "trialing", ret, true)).toEqual({ kind: "picker" }));
    it(`no plan, unlock, ${r} → picker`, () => expect(nextStep("unlock", "none", ret, true)).toEqual({ kind: "picker" }));
    it(`paid subscriber, trial link, ${r} → straight back`, () => expect(nextStep("trial", "active", ret, true)).toEqual({ kind: "return" }));
    it(`paid subscriber, unlock, ${r} → straight back`, () => expect(nextStep("unlock", "active", ret, true)).toEqual({ kind: "return" }));
    it(`paid subscriber, single link, ${r} → single checkout still allowed`, () => expect(nextStep("single", "active", ret, true)).toEqual(singleCo));
    it(`sign-in only, ${r} → return`, () => expect(nextStep("signin", "none", ret, true)).toEqual({ kind: "return" }));
  }
  it("plan link (old unlock), no plan → paid checkout", () => expect(nextStep("plan", "none", true, true)).toEqual(paidCo));
  it("intent detection", () => {
    expect(intentOf({ trial: "1", plan: "monthly" })).toBe("trial");
    expect(intentOf({ buy: "single" })).toBe("single");
    expect(intentOf({ plan: "complete" })).toBe("plan");
    expect(intentOf({})).toBe("signin");
  });
});

describe("off switch restores old routing", () => {
  it("return address skips checkout", () => expect(nextStep("trial", "none", true, false)).toEqual({ kind: "return" }));
  it("trial user on trial link goes to dashboard", () => expect(nextStep("trial", "trialing", false, false)).toEqual({ kind: "dashboard" }));
});

describe("finishing step", () => {
  it("waits until plan active/trialing", () => {
    expect(isCheckoutSettled({ active: false }, false)).toBe(false);
    expect(isCheckoutSettled({ active: true }, false)).toBe(true);
    expect(isCheckoutSettled(null, false)).toBe(false);
  });
  it("single purchase waits for the credit", () => {
    expect(isCheckoutSettled({ active: true, credits_available: 0 }, true)).toBe(false);
    expect(isCheckoutSettled({ credits_available: 1 }, true)).toBe(true);
  });
  const hosts = allowedReturnHosts([{ site_url: "https://productiq.globaledgemarkets.com", lifecycle: "live" }]);
  it("return check on the finishing page", () => {
    expect(checkReturnUrl("https://productiq.globaledgemarkets.com/r/1", hosts)).toBe("https://productiq.globaledgemarkets.com/r/1");
    expect(checkReturnUrl("https://evil.com/", hosts) ?? "/dashboard").toBe("/dashboard");
    expect(checkReturnUrl("https://x.lovable.app/", hosts) ?? "/dashboard").toBe("/dashboard");
  });
});

describe("old plan names (D1 = A)", () => {
  it("monthly and quarterly → Complete monthly, annual → Complete annual", () => {
    expect(resolvePlan("monthly")).toBe(PLAN_ALIASES["monthly"]);
    expect(PLAN_ALIASES["monthly"]).toBe("gemiq_complete_monthly");
    expect(PLAN_ALIASES["quarterly"]).toBe("gemiq_complete_monthly");
    expect(PLAN_ALIASES["annual"]).toBe("gemiq_complete_annual");
  });
  it("unknown plan names are ignored", () => expect(resolvePlan("platinum")).toBeUndefined());
  it("a new manifest lookup key works without a code change", () => expect(resolvePlan("new_key", [{ lookup_key: "new_key" }])).toBe("new_key"));
});

describe("plan picker renders whatever the manifest lists", () => {
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ lookup_key: `k${i}`, name: `Plan ${i}`, amount: 10 * (i + 1), interval: "month" }));
  for (const n of [2, 5]) it(`${n} plans → ${n} buttons in order`, () => {
    const html = renderToStaticMarkup(h(PlanPicker, { plans: mk(n), trialing: false, busy: null, onPick: () => {} }));
    expect(html.match(/data-gem-test="pick-/g)?.length).toBe(n);
    expect(html.indexOf("Plan 0")).toBeLessThan(html.indexOf(`Plan ${n - 1}`));
  });
  it("trial user button states the amount charged today", () => {
    const html = renderToStaticMarkup(h(PlanPicker, { plans: mk(1), trialing: true, busy: null, onPick: () => {} }));
    expect(html).toContain("Pay $10 today and unlock");
  });
});

import { formatMoney, annualSaving, backLink } from "@/lib/plan-display";
import manifest from "@/lib/hub/manifest.json";

describe("unlock page improvements (1.14.1)", () => {
  const plans = manifest.pricing.plans as any[];
  const render = (p: any[], extra: Record<string, unknown> = {}) =>
    renderToStaticMarkup(h(PlanPicker, { plans: p, trialing: false, busy: null, onPick: () => {}, currency: "USD", ...extra }));
  it("money has thousands separators and no decimals for whole amounts", () => {
    expect(formatMoney(2490, "USD")).toBe("$2,490");
    expect(formatMoney(249, "USD")).toBe("$249");
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
  });
  it("includes lines come from the manifest", () => {
    const html = render(plans);
    expect(html).toContain("Three assessments you choose");
    expect(html).toContain("Quarterly retakes");
  });
  it("no includes → no list", () => {
    expect(render([{ lookup_key: "a", name: "A", amount: 10, interval: "month" }])).not.toContain("plan-includes");
  });
  it("annual saving computed from today's manifest: $498, two months free", () => {
    const annual = plans.find((p) => p.interval === "year");
    expect(annualSaving(annual, plans)).toEqual({ amount: 498, monthsFree: 2 });
    expect(render(plans)).toContain("Save $498 — 2 months free");
  });
  it("saving hidden without a monthly match", () => {
    const only = plans.filter((p) => p.interval === "year");
    expect(annualSaving(only[0], only)).toBeNull();
    expect(render(only)).not.toContain("annual-saving");
  });
  it("'Your trial plan' marks the subscription's plan only", () => {
    const html = render(plans, { trialing: true, trialLookupKey: "gemiq_complete_monthly" });
    expect(html.match(/Your trial plan/g)?.length).toBe(1);
    expect(html.indexOf("Your trial plan")).toBeLessThan(html.indexOf("Complete — Monthly"));
    expect(html.indexOf("Your trial plan")).toBeGreaterThan(html.indexOf("Growth — Monthly"));
    expect(html).toContain("Pay $2,490 today and unlock");
  });
  it("Recommended label: zero flagged → none; one flagged → one", () => {
    expect(render(plans)).not.toContain("Recommended");
    const one = plans.map((p, i) => (i === 1 ? { ...p, recommended: true } : p));
    expect(render(one).match(/>Recommended</g)?.length).toBe(1);
  });
  it("back link uses the checked return address, else the dashboard", () => {
    expect(backLink("https://productiq.globaledgemarkets.com/results/1")).toEqual({ href: "https://productiq.globaledgemarkets.com/results/1", label: "Back to my report" });
    expect(backLink(null)).toEqual({ href: "/dashboard", label: "Back" });
  });
});
