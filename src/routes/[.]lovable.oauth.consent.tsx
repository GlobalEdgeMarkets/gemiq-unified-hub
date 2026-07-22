import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace — narrow typed wrapper so we can call the three methods.
type OAuthClient = { name?: string; redirect_uris?: string[] };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return { needsSignIn: true as const, details: null, authorizationId };
    }
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return { needsSignIn: false as const, details: data, authorizationId };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 font-sans text-gem-navy">
      <h1 className="font-display text-2xl font-bold">Authorization error</h1>
      <p className="mt-3 text-sm text-gem-navy/70">
        We couldn't load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const loaded = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(!loaded.needsSignIn);
  const [details, setDetails] = useState(loaded.details);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); setError(error.message); return; }
    const { data, error: detErr } = await oauthApi().getAuthorizationDetails(authorization_id);
    setBusy(false);
    if (detErr) { setError(detErr.message); return; }
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) { window.location.href = immediate; return; }
    setDetails(data);
    setSignedIn(true);
  }

  async function decide(approve: boolean) {
    setBusy(true); setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const input =
    "w-full rounded-md border border-gem-navy/15 bg-white px-3.5 py-2.5 text-sm text-gem-navy placeholder:text-gem-navy/40 outline-none focus:border-gem-mint focus:ring-2 focus:ring-gem-mint/25";
  const btnPrimary =
    "rounded-md bg-gem-mint px-4 py-2.5 text-sm font-semibold text-gem-navy shadow-sm transition hover:brightness-105 disabled:opacity-60";
  const btnSecondary =
    "rounded-md border border-gem-navy/20 px-4 py-2.5 text-sm font-semibold text-gem-navy transition hover:bg-gem-navy/5 disabled:opacity-60";

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-md p-8 font-sans text-gem-navy">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-mint">GEM.IQ Hub</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Sign in to connect</h1>
        <p className="mt-2 text-sm text-gem-navy/70">
          Sign in to your GEM.IQ account to approve this connection.
        </p>
        <form onSubmit={signIn} className="mt-6 space-y-3">
          <input className={input} type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button className={btnPrimary} type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </main>
    );
  }

  const clientName = details?.client?.name ?? "an app";

  return (
    <main className="mx-auto max-w-md p-8 font-sans text-gem-navy">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-mint">GEM.IQ Hub</p>
      <h1 className="mt-2 font-display text-2xl font-bold">
        Connect {clientName} to your account
      </h1>
      <p className="mt-3 text-sm text-gem-navy/70">
        This lets <strong>{clientName}</strong> use GEM.IQ Hub as you — reading your profile,
        subscription status, and assessment submissions across all IQ tools. It does not bypass
        Hub permissions or database policies.
      </p>
      {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-6 flex gap-3">
        <button className={btnPrimary} disabled={busy} onClick={() => decide(true)}>
          {busy ? "Working…" : "Approve"}
        </button>
        <button className={btnSecondary} disabled={busy} onClick={() => decide(false)}>
          Cancel connection
        </button>
      </div>
    </main>
  );
}
