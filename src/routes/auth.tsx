import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { iqContextFromReturnUrl } from "@/lib/hub/iq-context";
import gemLogoDark from "@/assets/gem-logo-dark.png.asset.json";

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
  { key: "tariffiq",       name: "TariffIQ",       blurb: "Tariff exposure & savings",       accent: "#05CFAB" },
  { key: "readinessiq",    name: "ReadinessIQ",    blurb: "Operational readiness",           accent: "#2D1594" },
  { key: "uxiq",           name: "UXIQ",           blurb: "Digital experience maturity",     accent: "#5aa9c9" },
  { key: "techservicesiq", name: "TechServicesIQ", blurb: "Technology services capability",  accent: "#e8b64a" },
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
            full_name: `${firstName} ${lastName}`.trim(),
            company,
          } : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? "Authentication failed"); return; }
      if (!body.user) {
        setErr("Account created but no session — please check your email to confirm, then sign in.");
        setMode("signin");
        return;
      }
      window.location.href = safeReturn ?? "/";
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  const inputCls =
    "w-full rounded-md border border-gem-navy/15 bg-white px-3.5 py-2.5 text-sm text-gem-navy placeholder:text-gem-navy/40 outline-none transition focus:border-gem-mint focus:ring-2 focus:ring-gem-mint/25";

  return (
    <div className="min-h-screen bg-white font-sans text-gem-ink antialiased">
      {/* Header — matches landing */}
      <header className="border-b border-gem-navy/10 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
          <img src={gemLogoDark.url} alt="GEM.IQ" className="h-8 w-auto" />
          <span className="hidden h-6 w-px bg-gem-navy/20 sm:block" />
          <span className="hidden font-display text-lg font-bold tracking-tight text-gem-navy sm:inline">
            GEM.IQ Hub
          </span>
          <a
            href="/"
            className="ml-auto text-sm font-medium text-gem-navy/70 hover:text-gem-navy"
          >
            ← Back to home
          </a>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-6 py-12 md:grid-cols-[1.05fr_1fr] md:py-16">
        {/* Brand / product panel */}
        <aside className="space-y-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-mint">
              GEM.IQ Hub
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-gem-navy sm:text-5xl">
              One account.
              <br />
              <span className="text-gem-mint">Four assessments.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-gem-navy/70">
              <strong className="text-gem-navy">GEM.IQ</strong> — GlobalEdgeMarkets
              Intelligence Quotients — is a suite of diagnostic assessments. Create one
              identity here and it works across every IQ.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {IQ_LIST.map(item => {
              const active = iq?.key === item.key;
              return (
                <li
                  key={item.key}
                  className={`relative overflow-hidden rounded-lg border bg-white p-4 transition ${
                    active
                      ? "border-gem-mint shadow-sm"
                      : "border-gem-navy/10 hover:border-gem-navy/25"
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ backgroundColor: item.accent }}
                  />
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.accent }}
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display text-sm font-bold leading-tight text-gem-navy">
                        {item.name}
                        {active && (
                          <span className="rounded-full bg-gem-mint/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gem-mint">
                            You're here
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gem-navy/60">{item.blurb}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-gem-navy/50">
            Sign in once, then move between assessments without another login.
          </p>
        </aside>

        {/* Auth form */}
        <form
          onSubmit={submit}
          className="w-full space-y-4 rounded-xl border border-gem-navy/10 bg-white p-7 shadow-sm"
        >
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gem-mint">
              GEM.IQ Hub
            </p>
            {iq ? (
              <>
                <h1 className="font-display text-2xl font-bold tracking-tight text-gem-navy">
                  {mode === "signup" ? `Create your account to start ${iq.name}` : `Sign in to continue to ${iq.name}`}
                </h1>
                <p className="text-sm text-gem-navy/65">
                  One GEM.IQ account works across every assessment — sign in once, use them all.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold tracking-tight text-gem-navy">
                  {mode === "signin" ? "Sign in to continue" : "Create your account"}
                </h1>
                <p className="text-sm text-gem-navy/65">
                  One identity across every GEM.IQ assessment.
                </p>
              </>
            )}
          </div>

          {iq && mode === "signup" && (
            <div className="rounded-md border border-gem-mint/40 bg-gem-mint/5 p-3.5 text-xs text-gem-navy/80">
              <p className="font-semibold text-gem-navy">{iq.priceLine}</p>
              <p className="mt-1 text-gem-navy/65">
                After creating your account, you'll be taken to secure checkout to activate {iq.name}.
              </p>
            </div>
          )}

          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="First name" autoComplete="given-name" className={inputCls}
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
                <input required placeholder="Last name" autoComplete="family-name" className={inputCls}
                  value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <input placeholder="Company" autoComplete="organization" className={inputCls}
                value={company} onChange={e => setCompany(e.target.value)} />
            </>
          )}
          <input required type="email" placeholder="Email" autoComplete="email" className={inputCls}
            value={email} onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"} className={inputCls}
            value={password} onChange={e => setPassword(e.target.value)} />
          {err && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-md bg-gem-mint px-4 py-3 text-sm font-semibold text-gem-navy shadow-sm shadow-gem-mint/20 transition hover:brightness-105 disabled:opacity-60"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-gem-navy/60 transition hover:text-gem-navy"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          {safeReturn && (
            <p className="text-center text-[11px] text-gem-navy/45">
              You'll return to {new URL(safeReturn).host}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
