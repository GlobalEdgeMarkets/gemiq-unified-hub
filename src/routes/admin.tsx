import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { marked } from "marked";
import {
  adminWhoami,
  adminBootstrapHubspot,
  adminImportLegacyUser,
  adminDeleteUser,
  adminRegistryStatus,
  adminPostHogAudit,
  adminListApps,
  adminUpdateApp,
  adminUpdateGlobal,
  adminCheckHealth,
  adminRegisterApp,
  adminVerifyOnboarding,
  adminGetReportSettings,
  adminSaveReportSettings,
  adminListReports,
  adminReportAction,
  adminResetPreview,
  adminResetBatch,
  adminResetFinish,
  adminContentVersions,
  adminContentAction,
  adminE2eOverview,
  adminE2eAction,
  adminE2eSaveSettings,
  adminOverview,
  adminPersonLookup,
} from "@/lib/admin.functions";
import { ContentPanel } from "@/components/admin/ContentPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { TestsPanel } from "@/components/admin/TestsPanel";
import { z } from "zod";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { PersonLookup } from "@/components/admin/PersonLookup";
import { ResetCard } from "@/components/admin/ReportsPanel";
import { PageIntro } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildHead } from "@/lib/seo";
import { ControlPanels } from "@/components/admin/ControlPanels";

export const Route = createFileRoute("/admin")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => z.object({ section: z.string().optional() }).parse({ section: typeof s.section === "string" ? s.section : undefined }),
  component: AdminConsole,
  head: () =>
    buildHead({
      title: "Hub Admin Console | GEM.IQ",
      description:
        "Internal GEM.IQ Hub maintenance console: HubSpot schema, legacy imports, registry status and submission browsing.",
      ogDescription: "Internal GEM.IQ Hub maintenance console.",
      twitterCard: "summary",
      robots: "noindex, nofollow",
    }),
});

type Json = unknown;

function Panel({ data }: { data: Json }) {
  if (data === undefined) return null;
  if (data && typeof data === "object" && "error" in (data as object)) {
    return <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">✗ {String((data as { error: unknown }).error)}</p>;
  }
  if (typeof data === "string") return <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground/80">{data}</p>;
  const lines = Object.entries((data ?? {}) as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v === true ? "yes" : v === false ? "no" : String(v)}`);
  return (
    <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
      <p className="font-medium text-primary">✓ Done</p>
      {lines.length ? <ul className="mt-2 grid gap-1 text-foreground/80">{lines.map((l) => <li key={l}>{l}</li>)}</ul> : null}
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function useAction<T>(fn: (arg?: never) => Promise<T>) {
  const [state, setState] = useState<{ loading: boolean; result?: unknown }>({ loading: false });
  const run = async (...args: unknown[]) => {
    setState({ loading: true });
    try {
      const out = await (fn as (...a: unknown[]) => Promise<T>)(...args);
      setState({ loading: false, result: out });
      return out;
    } catch (e) {
      setState({ loading: false, result: { error: e instanceof Error ? e.message : String(e) } });
      return undefined;
    }
  };
  return { ...state, run };
}

function AdminConsole() {
  const whoami = useServerFn(adminWhoami);
  const bootstrap = useServerFn(adminBootstrapHubspot);
  const importUser = useServerFn(adminImportLegacyUser);
  const deleteUser = useServerFn(adminDeleteUser);
  const registryStatus = useServerFn(adminRegistryStatus);
  const overview = useServerFn(adminOverview);
  const personLookup = useServerFn(adminPersonLookup);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const section = NAV.flatMap((g) => g.items).some((i) => i.key === search.section) ? search.section! : "overview";
  const go = (k: string) => navigate({ search: { section: k } });
  const [deleteEmail, setDeleteEmail] = useState("");
  const phAudit = useServerFn(adminPostHogAudit);
  const listApps = useServerFn(adminListApps);
  const updateApp = useServerFn(adminUpdateApp);
  const updateGlobal = useServerFn(adminUpdateGlobal);
  const checkHealth = useServerFn(adminCheckHealth);
  const registerApp = useServerFn(adminRegisterApp);
  const verifyOnboarding = useServerFn(adminVerifyOnboarding);
  const getReportSettings = useServerFn(adminGetReportSettings);
  const saveReportSettings = useServerFn(adminSaveReportSettings);
  const listReports = useServerFn(adminListReports);
  const reportAction = useServerFn(adminReportAction);
  const resetPreview = useServerFn(adminResetPreview);
  const resetBatch = useServerFn(adminResetBatch);
  const resetFinish = useServerFn(adminResetFinish);
  const contentVersions = useServerFn(adminContentVersions);
  const contentAction = useServerFn(adminContentAction);
  const e2eOverview = useServerFn(adminE2eOverview);
  const e2eAction = useServerFn(adminE2eAction);
  const e2eSave = useServerFn(adminE2eSaveSettings);
  const control = useMemo(
    () => ({ listApps, updateApp, updateGlobal, checkHealth, registerApp, verifyOnboarding }),
    [listApps, updateApp, updateGlobal, checkHealth, registerApp, verifyOnboarding],
  );

  const [gate, setGate] = useState<{ state: "loading" | "anon" | "denied" | "ok"; email?: string | null }>({
    state: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const who = await whoami();
        if (cancelled) return;
        if (!who.signed_in) setGate({ state: "anon" });
        else setGate({ state: who.is_admin ? "ok" : "denied", email: who.email });
      } catch {
        if (!cancelled) setGate({ state: "anon" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whoami]);

  if (gate.state === "loading") {
    return <Shell><p className="text-muted-foreground">Checking access…</p></Shell>;
  }
  if (gate.state === "anon") {
    return (
      <Shell>
        <p className="text-muted-foreground">
          You need to be signed in to the Hub to use the admin console.
        </p>
        <Button asChild className="mt-4">
          <a href={`/auth?redirect=${encodeURIComponent(window.location.href)}`}>Sign in</a>
        </Button>
      </Shell>
    );
  }
  if (gate.state === "denied") {
    return (
      <Shell>
        <p className="text-muted-foreground">
          {gate.email ?? "This account"} is not on the admin allowlist. Add the address to{" "}
          <code className="rounded bg-muted px-1">ADMIN_EMAILS</code> to grant access.
        </p>
      </Shell>
    );
  }

  const ctrl = control as unknown as React.ComponentProps<typeof ControlPanels>;
  const page = (() => {
    switch (section) {
      case "health": return <><PageIntro title="Health & settings" text="Is every assessment up and on the latest settings? Change banners and shared wording for all of them here." /><div className="grid gap-6"><ControlPanels {...ctrl} show="settings" /></div></>;
      case "content": return <><PageIntro title="Questions & scoring" text="Edit each assessment's questions, points and tiers. Save a draft, preview it, then publish." /><ContentPanel versions={contentVersions} action={contentAction} /></>;
      case "onboard": return <><PageIntro title="Add an assessment" text="Connect a new assessment to the Hub step by step." /><div className="grid gap-6"><ControlPanels {...ctrl} show="onboarding" /></div></>;
      case "reports": return <><PageIntro title="Reports" text="Every result from all assessments, and how reports look and lock." /><ReportsPanel getSettings={getReportSettings} saveSettings={saveReportSettings} listReports={listReports} reportAction={reportAction} /></>;
      case "people": return <><PageIntro title="Find a person" text="Everything about one customer in one place." /><PersonLookup lookup={personLookup as never} reportAction={reportAction as never} onDelete={(e) => { setDeleteEmail(e); go("danger"); }} /></>;
      case "tests": return <><PageIntro title="Tests" text="Send a test result through the Hub and confirm HubSpot picks it up." /><TestsPanel
            overview={e2eOverview as unknown as React.ComponentProps<typeof TestsPanel>["overview"]}
            action={e2eAction as unknown as React.ComponentProps<typeof TestsPanel>["action"]}
            saveSettings={e2eSave as unknown as React.ComponentProps<typeof TestsPanel>["saveSettings"]}
          /></>;
      case "tracking": return <><PageIntro title="Tracking" text="Check that every site sends its key events to PostHog." /><PostHogAuditCard run={phAudit} /></>;
      case "system": return <><PageIntro title="HubSpot & system" text="One-off setup and checks. Safe to run any time." /><div className="grid gap-6"><BootstrapCard run={bootstrap} /><RegistryCard run={registryStatus} /><ImportUsersCard run={importUser} /></div></>;
      case "danger": return <><PageIntro title="Danger zone" text="Permanent actions. Each one asks you to confirm first." /><div className="grid gap-6 rounded-2xl border border-destructive/40 p-4"><DeleteUserCard key={deleteEmail} run={deleteUser} initial={deleteEmail} /><ResetCard preview={resetPreview} batch={resetBatch} finish={resetFinish} /></div></>;
      default: return <><PageIntro title="Overview" text="Is anything wrong today? Start here." /><AdminOverview load={overview} checkHealth={checkHealth as never} quickTest={e2eAction as never} go={go} /></>;
    }
  })();

  return (
    <Shell email={gate.email}>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="md:sticky md:top-6 md:self-start">
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground md:hidden" value={section} onChange={(e) => go(e.target.value)}>
            {NAV.map((g) => (
              <optgroup key={g.group} label={g.group || "Start"}>
                {g.items.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
              </optgroup>
            ))}
          </select>
          <div className="hidden gap-5 md:grid">
            {NAV.map((g) => (
              <div key={g.group}>
                {g.group ? <p className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.group}</p> : null}
                <ul className="grid gap-0.5">
                  {g.items.map((i) => (
                    <li key={i.key}>
                      <button onClick={() => go(i.key)}
                        className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${section === i.key ? "bg-primary/15 font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"} ${i.key === "danger" ? "text-destructive" : ""}`}>
                        {i.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="min-w-0">{page}</div>
      </div>
    </Shell>
  );
}

const NAV: { group: string; items: { key: string; label: string }[] }[] = [
  { group: "", items: [{ key: "overview", label: "Overview" }] },
  { group: "Assessments", items: [{ key: "health", label: "Health & settings" }, { key: "content", label: "Questions & scoring" }, { key: "onboard", label: "Add an assessment" }] },
  { group: "Results", items: [{ key: "reports", label: "Reports" }] },
  { group: "Customers", items: [{ key: "people", label: "Find a person" }] },
  { group: "Quality", items: [{ key: "tests", label: "Tests" }, { key: "tracking", label: "Tracking" }] },
  { group: "Setup", items: [{ key: "system", label: "HubSpot & system" }, { key: "danger", label: "Danger zone" }] },
];

function Shell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-2xl text-foreground">Hub Admin</p>
          <p className="mt-2 text-sm text-muted-foreground">
            GEM Hub Central: run every assessment from one place.
            {email ? <> Signed in as <span className="text-foreground">{email}</span>.</> : null}
          </p>
        </div>
        {email ? (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await fetch("/api/public/auth/session", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ action: "signout" }),
                });
              } finally {
                window.location.href = "/";
              }
            }}
          >
            Log out
          </Button>
        ) : null}
      </header>
      {children}
    </main>
  );
}

function BootstrapCard({ run }: { run: () => Promise<unknown> }) {
  const a = useAction(run as never);
  return (
    <Card
      title="Set up HubSpot fields"
      description="Makes sure every GEM.IQ field exists in HubSpot. Safe to run any time."
    >
      <Button onClick={() => a.run()} disabled={a.loading}>
        {a.loading ? "Running…" : "Run bootstrap"}
      </Button>
      <BootstrapSummary result={a.result} />
    </Card>
  );
}

function BootstrapSummary({ result }: { result: unknown }) {
  const s = useMemo(() => {
    const r = result as { results?: { name: string; status: string }[] } | undefined;
    if (!r?.results) return null;
    const failed = r.results.filter((x) => x.status.includes("error"));
    const created = r.results.filter((x) => x.status === "created").length;
    const updated = r.results.filter((x) => x.status === "updated").length;
    return { total: r.results.length, created, updated, failed };
  }, [result]);
  if (result === undefined) return null;
  if (!s) return <Panel data={result} />;
  return (
    <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
      <p className={`font-medium ${s.failed.length ? "text-destructive" : "text-primary"}`}>
        {s.failed.length ? `${s.failed.length} HubSpot field(s) couldn't be set up` : `All ${s.total} HubSpot fields are in place`}
      </p>
      <ul className="mt-2 grid gap-1 text-foreground/80">
        <li>✓ {s.created} new field(s) added</li>
        <li>✓ {s.updated} field(s) refreshed</li>
        <li>✓ {s.total - s.created - s.updated - s.failed.length} already up to date</li>
        {s.failed.map((f) => <li key={f.name} className="text-destructive">✗ {f.name}</li>)}
      </ul>
    </div>
  );
}

function DeleteUserCard({ run, initial = "" }: { run: (a: { data: unknown }) => Promise<unknown>; initial?: string }) {
  const a = useAction(run as never);
  const [email, setEmail] = useState(initial);
  return (
    <Card
      title="Delete user"
      description="Permanently removes the person from every IQ app with a purge endpoint, HubSpot, Stripe (customer deleted, subscriptions cancelled immediately), and the Hub (results, credits, subscription records, account)."
    >
      <Label htmlFor="du-email">Email</Label>
      <Input id="du-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="person@company.com" />
      <Button
        className="mt-4"
        variant="destructive"
        disabled={a.loading || !email.includes("@")}
        onClick={() => {
          if (!window.confirm(`Permanently delete ${email.trim()} everywhere? This cannot be undone.`)) return;
          a.run({ data: { email: email.trim() } });
        }}
      >
        {a.loading ? "Deleting…" : "Delete user"}
      </Button>
      <DeleteResult data={a.result} />
    </Card>
  );
}

const IQ_NAMES: Record<string, string> = {
  gtmiq: "GTMIQ", salesiq: "SalesIQ", productiq: "ProductIQ", aitransformiq: "AITransformIQ", uxiq: "UXIQ", tariffiq: "TariffIQ",
};
function stepLabel(step: string): string {
  if (step.startsWith("purge ")) { const k = step.slice(6); return `Removed from ${IQ_NAMES[k] ?? k}`; }
  const map: Record<string, string> = {
    "hubspot contact": "Deleted HubSpot contact", "stripe customer": "Stripe customer", "auth account": "Deleted Hub account",
  };
  return map[step] ?? `Deleted Hub ${step}`;
}

function DeleteResult({ data }: { data: Json }) {
  const d = data as { email?: string; ok?: boolean; steps?: { step: string; ok: boolean; detail?: string }[] } | undefined;
  if (!d || !Array.isArray(d.steps)) return <Panel data={data} />;
  return (
    <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
      <p className={`font-medium ${d.ok ? "text-primary" : "text-destructive"}`}>
        {d.ok ? `${d.email} deleted everywhere` : `${d.email}: some steps failed`}
      </p>
      <ul className="mt-2 grid gap-1">
        {d.steps.map((s, i) => (
          <li key={i} className={s.ok ? "text-foreground/80" : "text-destructive"}>
            {s.ok ? "✓" : "✗"} {stepLabel(s.step)}{s.detail ? ` — ${s.detail}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImportUsersCard({ run }: { run: (a: { data: unknown }) => Promise<unknown> }) {
  const a = useAction(run as never);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [invite, setInvite] = useState(true);
  return (
    <Card
      title="Import legacy user"
      description="Creates the Hub auth account (or no-ops if it exists) and ensures a profile row."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="lu-email">Email</Label>
          <Input id="lu-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="person@company.com" />
        </div>
        <div>
          <Label htmlFor="lu-name">Full name</Label>
          <Input id="lu-name" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lu-company">Company</Label>
          <Input id="lu-company" value={company} onChange={e => setCompany(e.target.value)} />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={invite} onChange={e => setInvite(e.target.checked)} />
        Send password-setup invite
      </label>
      <Button
        className="mt-4"
        disabled={a.loading || !email.includes("@")}
        onClick={() =>
          a.run({
            data: {
              email: email.trim(),
              full_name: fullName || undefined,
              company: company || undefined,
              send_invite: invite,
            },
          })
        }
      >
        {a.loading ? "Importing…" : "Import user"}
      </Button>
      <Panel data={a.result} />
    </Card>
  );
}


function RegistryCard({ run }: { run: () => Promise<unknown> }) {
  const a = useAction(run as never);
  useEffect(() => { a.run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const data = a.result as {
    manifest_version?: string;
    manifest_updated_at?: string | null;
    registry?: { key: string; display_name: string; contact_properties: number }[];
  } | undefined;
  return (
    <Card
      title="Registry and manifest status"
      description="Confirms what the deployed build actually contains — registry keys, manifest version, property counts."
    >
      <Button variant="outline" onClick={() => a.run()} disabled={a.loading}>
        {a.loading ? "Reading…" : "Refresh"}
      </Button>
      {data?.registry ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Manifest version <span className="text-foreground">{data.manifest_version}</span>
            {data.manifest_updated_at ? ` · updated ${data.manifest_updated_at}` : null}
          </p>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="py-1">Key</th><th>Name</th><th className="text-right">Properties</th></tr>
            </thead>
            <tbody>
              {data.registry.map(r => (
                <tr key={r.key} className="border-t border-border/50">
                  <td className="py-1.5"><code>{r.key}</code></td>
                  <td>{r.display_name}</td>
                  <td className="text-right">{r.contact_properties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Panel data={a.result} />
      )}
    </Card>
  );
}

const AUDIT_SITES = [
  ["gemiq", "GEM.IQ"],
  ["tariffiq", "TariffIQ"],
  ["gtmiq", "GTMIQ"],
  ["salesiq", "SalesIQ"],
  ["productiq", "ProductIQ"],
  ["aitransformiq", "AITransformIQ"],
  ["uxiq", "UXIQ"],
] as const;

type AuditOut = {
  rows: { site: string; event: string; count: number }[];
  lastSeen: Record<string, string | null>;
  report: string;
};

function PostHogAuditCard({ run }: { run: (a: { data: unknown }) => Promise<unknown> }) {
  const a = useAction(run as never);
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [sites, setSites] = useState<string[]>(AUDIT_SITES.map(([k]) => k));
  const out = a.result as (AuditOut & { error?: string }) | undefined;
  const events = out?.rows ? Array.from(new Set(out.rows.map((r) => r.event))) : [];
  const picked = out?.rows ? Array.from(new Set(out.rows.map((r) => r.site))) : [];
  const label = (k: string) => AUDIT_SITES.find(([s]) => s === k)?.[1] ?? k;

  return (
    <Card
      title="Check PostHog tracking"
      description="Counts the key events each live site sent to PostHog in a date range, then AI points out what looks missing or low and how to fix it."
    >
      <div className="flex flex-wrap gap-4">
        <div>
          <Label htmlFor="ph-from">From</Label>
          <Input id="ph-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ph-to">To</Label>
          <Input id="ph-to" type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {AUDIT_SITES.map(([k, name]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sites.includes(k)}
              onChange={(e) => setSites((s) => (e.target.checked ? [...s, k] : s.filter((x) => x !== k)))}
            />
            {name}
          </label>
        ))}
      </div>
      <Button
        className="mt-4"
        disabled={a.loading || sites.length === 0 || !from || !to}
        onClick={() => a.run({ data: { from, to, sites } })}
      >
        {a.loading ? "Analyzing… (up to a minute)" : "Analyze tracking"}
      </Button>
      {out?.error && <p className="mt-4 text-sm text-destructive">{out.error}</p>}
      {out?.report && (
        <>
          <div
            className="mt-4 space-y-2 rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-foreground [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: marked.parse(out.report.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), { async: false }) as string }}
          />
          <div className="mt-4 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3">Site</th>
                  <th className="py-2 pr-3">Last activity</th>
                  {events.map((e) => (
                    <th key={e} className="py-2 pr-3">{e}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {picked.map((s) => (
                  <tr key={s} className="border-b border-border/40">
                    <td className="py-2 pr-3 font-medium text-foreground">{label(s)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {out.lastSeen[s] ? new Date(out.lastSeen[s]!).toLocaleString() : "None"}
                    </td>
                    {events.map((e) => {
                      const c = out.rows.find((r) => r.site === s && r.event === e)?.count ?? 0;
                      return (
                        <td key={e} className={`py-2 pr-3 ${c === 0 ? "text-destructive" : "text-foreground"}`}>{c}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
