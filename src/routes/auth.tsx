import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { iqContextFromReturnUrl } from "@/lib/hub/iq-context";

/** Only allow return-to URLs on the GEM.IQ Hub itself or *.globaledgemarkets.com. */
function isAllowedReturnUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".lovable.app")) return u.toString();
    if (host === "globaledgemarkets.com" || host.endsWith(".globaledgemarkets.com")) return u.toString();
    return null;
  } catch { return null; }
}

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — GEM.IQ Hub" },
      { name: "description", content: "One account across every GEM.IQ assessment — TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ." },
      { property: "og:title", content: "GEM.IQ Hub — Sign in" },
      { property: "og:description", content: "One identity across all GEM.IQ assessments." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

const IQ_LIST: { key: string; name: string; blurb: string; accent: string }[] = [
  { key: "tariffiq",       name: "TariffIQ",       blurb: "Tariff exposure & savings",   accent: "#05CFAB" },
  { key: "readinessiq",    name: "ReadinessIQ",    blurb: "Operational readiness",       accent: "#2D1594" },
  { key: "uxiq",           name: "UXIQ",           blurb: "Digital experience maturity", accent: "#2C365B" },
  { key: "techservicesiq", name: "TechServicesIQ", blurb: "Technology services capability", accent: "#0EA5A0" },
];

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const safeReturn = isAllowedReturnUrl(search.redirect);
  const iq = iqContextFromReturnUrl(safeReturn);
  const defaultMode = search.mode ?? (iq ? "signup" : "signin");
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/public/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: mode,
          email, password,
          metadata: mode === "signup" ? {
            first_name: firstName,
            last_name: lastName,
            // Keep a combined form too for legacy consumers.
            full_name: `${firstName} ${lastName}`.trim(),
            company,
          } : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? "Authentication failed"); return; }
      window.location.href = safeReturn ?? "/";
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[1.05fr_1fr] md:items-start">
        {/* Brand / product panel */}
        <aside className="space-y-6 md:pt-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">GEM.IQ Hub</p>
            <h2 className="text-3xl font-semibold tracking-tight">
              One account. Four assessments.
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              <strong className="text-foreground">GEM.IQ</strong> — GlobalEdgeMarkets Intelligence Quotients — is a suite of
              diagnostic assessments from GlobalEdgeMarkets. Create one identity here and it works across every IQ.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {IQ_LIST.map(item => {
              const active = iq?.key === item.key;
              return (
                <li
                  key={item.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                    active ? "border-foreground/30 bg-muted/50 shadow-sm" : "border-border/60 bg-card"
                  }`}
                >
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.accent }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {item.name}
                      {active && <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">You're here</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.blurb}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-muted-foreground">
            Sign in once, then move between assessments without another login.
          </p>
        </aside>

        {/* Auth form */}
        <form onSubmit={submit} className="w-full space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">GEM.IQ Hub</p>
            {iq ? (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {mode === "signup" ? `Create your account to start ${iq.name}` : `Sign in to continue to ${iq.name}`}
                </h1>
                <p className="text-sm text-muted-foreground">
                  One GEM.IQ account works across every assessment — sign in once, use them all.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {mode === "signin" ? "Sign in to continue" : "Create your account"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  One identity across every GEM.IQ assessment.
                </p>
              </>
            )}
          </div>

          {iq && mode === "signup" && (
            <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{iq.priceLine}</p>
              <p className="mt-1">After creating your account, you'll be taken to secure checkout to activate {iq.name}.</p>
            </div>
          )}

          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="First name"
                  autoComplete="given-name"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
                <input
                  required
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
              <input
                placeholder="Company"
                autoComplete="organization"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </>
          )}
          <input required type="email" placeholder="Email" autoComplete="email"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password" autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={password} onChange={e => setPassword(e.target.value)} />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          {safeReturn && (
            <p className="text-center text-[11px] text-muted-foreground">You'll return to {new URL(safeReturn).host}</p>
          )}
        </form>
      </div>
    </div>
  );
}
