import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { HubHeader } from "@/components/HubHeader";
import { getFlowContext } from "@/lib/checkout-flow.functions";
import { buildHead } from "@/lib/seo";
import { isCheckoutSettled } from "@/lib/checkout-settled";

const str = z.preprocess((v) => (v == null ? v : String(v)), z.string().optional()).catch(undefined);

export const Route = createFileRoute("/checkout/return")({
  validateSearch: z.object({ to: str, kind: str, cancelled: str }),
  loaderDeps: ({ search }) => ({ to: search.to }),
  // `to` is re-checked on the server; anything not allowed goes to the dashboard.
  loader: async ({ deps }) => getFlowContext({ data: { url: deps.to } }),
  head: () => buildHead({
    title: "Finishing your setup — GEM.IQ Hub",
    description: "Confirming your GEM.IQ plan after checkout.",
    ogTitle: "GEM.IQ — finishing setup",
    ogDescription: "Confirming your plan after checkout.",
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const search = useSearch({ from: "/checkout/return" });
  const { url } = Route.useLoaderData();
  const target = url ?? "/dashboard";
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (search.cancelled) { window.location.href = target; return; }
    let alive = true;
    const started = Date.now();
    (async () => {
      while (alive && Date.now() - started < 20000) {
        const sub = await fetch("/api/public/billing/check-subscription", { credentials: "include" }).then((r) => r.json()).catch(() => null);
        if (isCheckoutSettled(sub, search.kind === "single")) { window.location.href = target; return; }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (alive) setTimedOut(true);
    })();
    return () => { alive = false; };
  }, [search.cancelled, search.kind, target]);

  return (
    <div className="min-h-screen bg-white font-sans text-gem-ink antialiased">
      <HubHeader variant="auth" />
      <main className="mx-auto w-full max-w-xl px-6 py-16 text-center">
        {!timedOut ? (
          <>
            <h1 className="font-display text-3xl font-bold text-gem-navy">{search.cancelled ? "Taking you back…" : "Finishing your setup…"}</h1>
            {!search.cancelled && <p className="mt-3 text-gem-navy/70">Confirming your plan. This usually takes a few seconds.</p>}
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-gem-navy">Payment received — your access is being confirmed</h1>
            <p className="mt-3 text-gem-navy/70">It can take a minute. Continue now; if something still looks locked, refresh shortly.</p>
            <a href={target} data-gem-test="checkout-continue" className="mt-6 inline-block rounded-md bg-gem-mint px-5 py-3 text-sm font-semibold text-gem-navy">Continue</a>
          </>
        )}
      </main>
    </div>
  );
}
