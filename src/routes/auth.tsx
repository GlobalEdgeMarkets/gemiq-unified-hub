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

  const inputCls =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/50 shadow-inner shadow-black/10 outline-none transition focus:border-gem-mint/60 focus:bg-white/10 focus:ring-2 focus:ring-gem-mint/30";

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* Brand background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 8% -10%, #2D1594 0%, transparent 55%), radial-gradient(900px 500px at 100% 0%, #05CFAB33 0%, transparent 60%), radial-gradient(700px 700px at 90% 110%, #2D159466 0%, transparent 60%), linear-gradient(160deg, #172864 0%, #2C365B 55%, #0f1a3d 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-[1.05fr_1fr]">
        {/* Brand / product panel */}
        <aside className="space-y-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black tracking-tight text-gem-navy-deep shadow-lg shadow-gem-mint/20"
              style={{ background: "linear-gradient(135deg, #05CFAB, #7fe6d0)" }}
            >
              IQ
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gem-mint">GEM.IQ Hub</p>
              <p className="text-[11px] text-white/60">by GlobalEdgeMarkets</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
              One account.
              <br />
              <span className="bg-gradient-to-r from-gem-mint via-gem-mint-soft to-white bg-clip-text text-transparent">
                Four assessments.
              </span>
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-white/75">
              <strong className="text-white">GEM.IQ</strong> — GlobalEdgeMarkets Intelligence Quotients — is a
              suite of diagnostic assessments. Create one identity here and it works across every IQ.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {IQ_LIST.map(item => {
              const active = iq?.key === item.key;
              return (
                <li
                  key={item.key}
                  className={`group relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm transition ${
                    active
                      ? "border-gem-mint/60 bg-white/10 shadow-lg shadow-gem-mint/10"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
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
                      className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-4"
                      style={{ backgroundColor: item.accent, boxShadow: `0 0 0 4px ${item.accent}22` }}
                    />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold leading-tight text-white">
                        {item.name}
                        {active && (
                          <span className="rounded-full bg-gem-mint/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gem-mint">
                            You're here
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-white/60">{item.blurb}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-white/50">
            Sign in once, then move between assessments without another login.
          </p>
        </aside>

        {/* Auth form */}
        <form
          onSubmit={submit}
          className="w-full space-y-4 rounded-2xl border border-white/15 bg-white/[0.06] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl"
        >
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gem-mint">GEM.IQ Hub</p>
            {iq ? (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {mode === "signup" ? `Create your account to start ${iq.name}` : `Sign in to continue to ${iq.name}`}
                </h1>
                <p className="text-sm text-white/70">
                  One GEM.IQ account works across every assessment — sign in once, use them all.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {mode === "signin" ? "Sign in to continue" : "Create your account"}
                </h1>
                <p className="text-sm text-white/70">
                  One identity across every GEM.IQ assessment.
                </p>
              </>
            )}
          </div>

          {iq && mode === "signup" && (
            <div className="rounded-lg border border-gem-mint/30 bg-gem-mint/10 p-3.5 text-xs text-white/80">
              <p className="font-semibold text-white">{iq.priceLine}</p>
              <p className="mt-1 text-white/70">
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
            <p className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</p>
          )}
          <button
            disabled={busy}
            className="group relative w-full overflow-hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-gem-navy-deep shadow-lg shadow-gem-mint/20 transition hover:shadow-gem-mint/40 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #05CFAB 0%, #7fe6d0 100%)" }}
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs text-white/60 transition hover:text-gem-mint"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
          {safeReturn && (
            <p className="text-center text-[11px] text-white/40">
              You'll return to {new URL(safeReturn).host}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
