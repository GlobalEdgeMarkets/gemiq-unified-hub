import { annualSaving, formatMoney, type DisplayPlan } from "@/lib/plan-display";

export type PickerPlan = DisplayPlan;

const PER: Record<string, string> = { month: "month", quarter: "quarter", year: "year" };

/** Renders whatever plans the manifest lists, in manifest order. No names, prices or benefits typed here. */
export function PlanPicker({ plans, trialing, busy, onPick, currency = "USD", trialLookupKey = null }: {
  plans: PickerPlan[]; trialing: boolean; busy: string | null; onPick: (lookupKey: string) => void;
  currency?: string; trialLookupKey?: string | null;
}) {
  const m = (n: number) => formatMoney(n, currency);
  return (
    <ul className="grid gap-3" data-gem-test="plan-picker">
      {plans.map((p) => {
        const saving = annualSaving(p, plans);
        const isTrialPlan = trialing && !!trialLookupKey && trialLookupKey === p.lookup_key;
        return (
          <li key={p.lookup_key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gem-navy/15 bg-white p-4">
            <div className="min-w-0 flex-1">
              {(p.recommended || isTrialPlan) && (
                <div className="mb-1 flex flex-wrap gap-2">
                  {p.recommended && <span data-gem-test="label-recommended" className="rounded-full bg-gem-mint/20 px-2 py-0.5 text-xs font-semibold text-gem-navy">Recommended</span>}
                  {isTrialPlan && <span data-gem-test="label-trial-plan" className="rounded-full bg-gem-navy/10 px-2 py-0.5 text-xs font-semibold text-gem-navy">Your trial plan</span>}
                </div>
              )}
              <p className="font-display text-lg font-semibold text-gem-navy">{p.name}</p>
              <p className="text-sm text-gem-navy/70">{m(p.amount)} per {PER[p.interval] ?? p.interval}</p>
              {saving && (
                <p data-gem-test="annual-saving" className="text-sm font-semibold text-gem-navy">
                  Save {m(saving.amount)}{saving.monthsFree ? ` — ${saving.monthsFree} month${saving.monthsFree === 1 ? "" : "s"} free` : ""}
                </p>
              )}
              {Array.isArray(p.includes) && p.includes.length > 0 && (
                <ul data-gem-test="plan-includes" className="mt-2 list-disc pl-5 text-sm text-gem-navy/80">
                  {p.includes.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </div>
            <button
              type="button" disabled={!!busy} onClick={() => onPick(p.lookup_key)} data-gem-test={`pick-${p.lookup_key}`}
              className="rounded-md bg-gem-mint px-4 py-2.5 text-sm font-semibold text-gem-navy disabled:opacity-60"
            >
              {busy === p.lookup_key ? "…" : trialing ? `Pay ${m(p.amount)} today and unlock` : `Continue to checkout — ${m(p.amount)}`}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
