// Browser helper: start Hub checkout. Stripe only ever gets Hub addresses; the
// return address travels as ?to= and is re-checked on /checkout/return.
export async function startCheckout(o: { lookupKey: string; trial: boolean; single: boolean; returnTo: string | null }): Promise<string | null> {
  const base = `${window.location.origin}/checkout/return?${new URLSearchParams({ ...(o.returnTo ? { to: o.returnTo } : {}), ...(o.single ? { kind: "single" } : {}) })}`;
  const r = await fetch("/api/public/billing/create-checkout", {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lookup_key: o.lookupKey, trial: o.trial, success_url: base, cancel_url: `${base}&cancelled=1` }),
  });
  const b = await r.json().catch(() => ({}));
  return r.ok && b.url ? b.url : null;
}
