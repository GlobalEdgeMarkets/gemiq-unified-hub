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
  adminListSubmissions,
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
  adminGetFollowups,
  adminSaveFollowups,
  adminTestFollowup,
  adminContentVersions,
  adminContentAction,
} from "@/lib/admin.functions";
import { FollowupsPanel } from "@/components/admin/FollowupsPanel";
import { ContentPanel } from "@/components/admin/ContentPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildHead } from "@/lib/seo";
import { ControlPanels } from "@/components/admin/ControlPanels";

export const Route = createFileRoute("/admin")({
  ssr: false,
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
  return (
    <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-foreground/80">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
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
  const listSubs = useServerFn(adminListSubmissions);
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
  const getFollowups = useServerFn(adminGetFollowups);
  const saveFollowups = useServerFn(adminSaveFollowups);
  const testFollowup = useServerFn(adminTestFollowup);
  const contentVersions = useServerFn(adminContentVersions);
  const contentAction = useServerFn(adminContentAction);
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

  return (
    <Shell email={gate.email}>
      <Tabs defaultValue="control">
        <TabsList className="mb-6">
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
          <TabsTrigger value="users">Users & data</TabsTrigger>
        </TabsList>
        <TabsContent value="control" className="grid gap-6">
          <ControlPanels {...(control as unknown as React.ComponentProps<typeof ControlPanels>)} />
        </TabsContent>
        <TabsContent value="content">
          <ContentPanel versions={contentVersions} action={contentAction} />
        </TabsContent>
        <TabsContent value="reports" className="grid gap-6">
          <FollowupsPanel get={getFollowups} save={saveFollowups} test={testFollowup} />
          <ReportsPanel getSettings={getReportSettings} saveSettings={saveReportSettings} listReports={listReports} reportAction={reportAction}
            resetPreview={resetPreview} resetBatch={resetBatch} resetFinish={resetFinish} />
        </TabsContent>
        <TabsContent value="tracking" className="grid gap-6">
          <PostHogAuditCard run={phAudit} />
        </TabsContent>
        <TabsContent value="users" className="grid gap-6">
          <DeleteUserCard run={deleteUser} />
          <ImportUsersCard run={importUser} />
          <SubmissionsCard run={listSubs} />
          <RegistryCard run={registryStatus} />
          <BootstrapCard run={bootstrap} />
        </TabsContent>
      </Tabs>
    </Shell>
  );
}

function Shell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Hub Admin Console</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every maintenance action as a button. Nothing here exposes server secrets to the browser.
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
      title="Bootstrap HubSpot schema"
      description="Creates or updates every GEM.IQ contact and lead property. Idempotent — safe to re-run."
    >
      <Button onClick={() => a.run()} disabled={a.loading}>
        {a.loading ? "Running…" : "Run bootstrap"}
      </Button>
      <BootstrapSummary result={a.result} />
      <Panel data={a.result} />
    </Card>
  );
}

function BootstrapSummary({ result }: { result: unknown }) {
  const summary = useMemo(() => {
    const r = result as { results?: { status: string }[] } | undefined;
    if (!r?.results) return null;
    const counts: Record<string, number> = {};
    for (const x of r.results) counts[x.status] = (counts[x.status] ?? 0) + 1;
    return counts;
  }, [result]);
  if (!summary) return null;
  return (
    <p className="mt-3 text-sm text-muted-foreground">
      {Object.entries(summary).map(([k, v]) => `${v} ${k}`).join(" · ")}
    </p>
  );
}

function DeleteUserCard({ run }: { run: (a: { data: unknown }) => Promise<unknown> }) {
  const a = useAction(run as never);
  const [email, setEmail] = useState("");
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
      <Panel data={a.result} />
    </Card>
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

function SubmissionsCard({ run }: { run: (a: { data: unknown }) => Promise<unknown> }) {
  const a = useAction(run as never);
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const data = a.result as { rows?: Record<string, string | number | null>[]; count?: number | null } | undefined;
  const search = () =>
    a.run({ data: { email: email || undefined, assessment_key: key || undefined, limit: 50 } });
  useEffect(() => { search(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <Card
      title="Submission browser"
      description="Verification surface for imports and syncs: score, tier, submitted date, HubSpot contact and sync time."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="sb-email">Email contains</Label>
          <Input id="sb-email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sb-key">Assessment key</Label>
          <Input id="sb-key" value={key} onChange={e => setKey(e.target.value)} placeholder="tariffiq" />
        </div>
        <div className="flex items-end">
          <Button onClick={search} disabled={a.loading}>{a.loading ? "Loading…" : "Search"}</Button>
        </div>
      </div>
      {data?.rows ? (
        <div className="mt-4 overflow-x-auto">
          <p className="text-sm text-muted-foreground">{data.rows.length} shown{typeof data.count === "number" ? ` of ${data.count}` : ""}</p>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1">Email</th><th>Key</th><th>Score</th><th>Tier</th>
                <th>Submitted</th><th>HubSpot ID</th><th>Synced</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={String(r.id)} className="border-t border-border/50">
                  <td className="py-1.5">{String(r.email)}</td>
                  <td><code>{String(r.assessment_key)}</code></td>
                  <td>{r.score ?? "—"}</td>
                  <td>{r.tier ?? "—"}</td>
                  <td>{r.submitted_at ? String(r.submitted_at).slice(0, 10) : "—"}</td>
                  <td>{r.hubspot_contact_id ?? "—"}</td>
                  <td>{r.hubspot_synced_at ? String(r.hubspot_synced_at).slice(0, 10) : "—"}</td>
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
