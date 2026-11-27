import { money } from "@/lib/pricing";

export interface PickerPlan { lookup_key: string; name: string; amount: number; interval: string }

const PER: Record<string, string> = { month: "month", quarter: "quarter", year: "year" };

/** Renders whatever plans the manifest lists, in manifest order. No names or prices typed here. */
export function PlanPicker({ plans, trialing, busy, onPick }: {
  plans: PickerPlan[]; trialing: boolean; busy: string | null; onPick: (lookupKey: string) => void;
}) {
  return (
    <ul className="grid gap-3" data-gem-test="plan-picker">
      {plans.map((p) => (
        <li key={p.lookup_key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gem-navy/15 bg-white p-4">
          <div>
            <p className="font-display text-lg font-semibold text-gem-navy">{p.name}</p>
            <p className="text-sm text-gem-navy/70">{money(p.amount)} per {PER[p.interval] ?? p.interval}</p>
          </div>
          <button
            type="button" disabled={!!busy} onClick={() => onPick(p.lookup_key)} data-gem-test={`pick-${p.lookup_key}`}
            className="rounded-md bg-gem-mint px-4 py-2.5 text-sm font-semibold text-gem-navy disabled:opacity-60"
          >
            {busy === p.lookup_key ? "…" : trialing ? `Pay ${money(p.amount)} today and unlock` : `Continue to checkout — ${money(p.amount)}`}
          </button>
        </li>
      ))}
    </ul>
  );
}
