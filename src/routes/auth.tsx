import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

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
      { name: "description", content: "Sign in to the GEM.IQ platform. Shared identity across all GEM.IQ assessments." },
      { property: "og:title", content: "GEM.IQ Hub — Sign in" },
      { property: "og:description", content: "One identity across all GEM.IQ assessments." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
          metadata: mode === "signup" ? { full_name: fullName, company } : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) { setErr(body.error ?? "Authentication failed"); return; }
      if (search.redirect) window.location.href = search.redirect;
      else window.location.href = "/";
    } catch (e: any) {
      setErr(e.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">GEM.IQ Hub</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>
        {mode === "signup" && (
          <>
            <input required placeholder="Full name" className="w-full rounded-md border px-3 py-2 text-sm"
              value={fullName} onChange={e => setFullName(e.target.value)} />
            <input placeholder="Company" className="w-full rounded-md border px-3 py-2 text-sm"
              value={company} onChange={e => setCompany(e.target.value)} />
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
        {search.redirect && (
          <p className="text-center text-[11px] text-muted-foreground">You'll return to {new URL(search.redirect).host}</p>
        )}
      </form>
    </div>
  );
}
