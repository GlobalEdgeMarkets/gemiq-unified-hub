import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { HubHeader } from "@/components/HubHeader";
import { PlanPicker, type PickerPlan } from "@/components/checkout/PlanPicker";
import { getFlowContext } from "@/lib/checkout-flow.functions";
import { nextStep, planStateOf } from "@/lib/auth-checkout";
import { startCheckout } from "@/lib/checkout-client";
import { PRICING } from "@/lib/pricing";
import { buildHead } from "@/lib/seo";

export const Route = createFileRoute("/unlock")({
  validateSearch: z.object({ redirect: z.preprocess((v) => (v == null ? v : String(v)), z.string().optional()).catch(undefined) }),
  loaderDeps: ({ search }) => ({ redirect: search.redirect }),
  loader: async ({ deps }) => getFlowContext({ data: { url: deps.redirect } }),
  head: () => buildHead({
    title: "Unlock your full report — GEM.IQ Hub",
    description: "Choose a GEM.IQ plan to unlock your full assessment report.",
    ogTitle: "Unlock your GEM.IQ report",
    ogDescription: "Choose a plan and unlock your full report.",
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const search = useSearch({ from: "/unlock" });
  const { url: safeReturn, flowOn } = Route.useLoaderData();
  const [state, setState] = useState<"loading" | "pick" | "error">("loading");
  const [trialing, setTrialing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const plans = PRICING.plans as PickerPlan[];

  useEffect(() => {
    (async () => {
      const sub = await fetch("/api/public/billing/check-subscription", { credentials: "include" }).then((r) => r.json()).catch(() => null);
      if (!sub?.authenticated) {
        window.location.href = `/auth?${new URLSearchParams({ mode: "signin", redirect: window.location.href })}`;
        return;
      }
      const step = nextStep("unlock", planStateOf(sub), !!safeReturn, flowOn);
      if (step.kind === "return") { window.location.href = safeReturn ?? "/dashboard"; return; }
      setTrialing(!!sub.trialing);
      setState("pick");
    })();
  }, [safeReturn, flowOn]);

  async function pick(lookupKey: string) {
    setBusy(lookupKey);
    const url = await startCheckout({ lookupKey, trial: false, single: false, returnTo: safeReturn }).catch(() => null);
    if (url) { window.location.href = url; return; }
    setBusy(null); setState("error");
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gem-ink antialiased">
      <HubHeader variant="auth" />
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold text-gem-navy">Unlock your full report — choose a plan</h1>
        {state === "loading" && <p className="mt-6 text-gem-navy/70">Checking your account…</p>}
        {state !== "loading" && (
          <>
            <p className="mt-3 text-gem-navy/70">
              {trialing ? "Your trial ends today and the card on file is charged the amount shown." : "You'll go to secure checkout."}
              {PRICING.guarantee?.days ? ` ${PRICING.copy?.guarantee_line ?? ""}` : ""}
            </p>
            <div className="mt-6"><PlanPicker plans={plans} trialing={trialing} busy={busy} onPick={pick} /></div>
            {state === "error" && <p className="mt-4 text-sm text-destructive">We couldn't start checkout. Please try again.</p>}
            {search.redirect && safeReturn && <p className="mt-6 text-sm text-gem-navy/60">You'll return to {new URL(safeReturn).host} afterwards.</p>}
          </>
        )}
      </main>
    </div>
  );
}
