import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminWhoami,
  adminBootstrapHubspot,
  adminImportLegacyUser,
  adminRegistryStatus,
  adminPreflight,
  adminListSubmissions,
  adminCalibrateReadinessScores,
  adminMigrateReadinessIQ,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminConsole,
  head: () => ({
    meta: [
      { title: "Hub Admin Console | GEM.IQ" },
      { name: "description", content: "Internal GEM.IQ Hub maintenance console: HubSpot schema, legacy imports, registry status and submission browsing." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Hub Admin Console | GEM.IQ" },
      { property: "og:description", content: "Internal GEM.IQ Hub maintenance console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
  const registryStatus = useServerFn(adminRegistryStatus);
  const preflight = useServerFn(adminPreflight);
  const listSubs = useServerFn(adminListSubmissions);
  const calibrate = useServerFn(adminCalibrateReadinessScores);
  const migrate = useServerFn(adminMigrateReadinessIQ);
  const [calibrated, setCalibrated] = useState(false);

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
      <div className="grid gap-6">
        <BootstrapCard run={bootstrap} />
        <ImportUsersCard run={importUser} />
        <CalibrationCard run={calibrate} calibrated={calibrated} setCalibrated={setCalibrated} />
        <MigrateCard run={migrate} preflight={preflight} calibrated={calibrated} />
        <RegistryCard run={registryStatus} />
        <SubmissionsCard run={listSubs} />
      </div>
    </Shell>
  );
}

function Shell({ children, email }: { children: React.ReactNode; email?: string | null }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-14">
      <header className="mb-10">
        <h1 className="font-heading text-3xl text-foreground">Hub Admin Console</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every maintenance action as a button. Nothing here exposes server secrets to the browser.
          {email ? <> Signed in as <span className="text-foreground">{email}</span>.</> : null}
        </p>
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

type CalibrationRow = {
  legacy_id: string | null;
  email: string | null;
  product_type: string | null;
  created_at: string | null;
  dimension_count: number;
  mean_0_9: number | null;
  derived_score_100: number | null;
  derived_tier: string | null;
  stored_total: number | null;
  legacy_tier_label: string | null;
  report_url: string | null;
};

function CalibrationCard({
  run,
  calibrated,
  setCalibrated,
}: {
  run: (a: { data: unknown }) => Promise<unknown>;
  calibrated: boolean;
  setCalibrated: (v: boolean) => void;
}) {
  const a = useAction(run as never);
  const [limit, setLimit] = useState("25");
  const [email, setEmail] = useState("");
  const res = a.result as
    | {
        read?: number;
        by_product_type?: Record<string, number>;
        tier_distribution?: Record<string, number>;
        stored_total_found?: number;
        disagreements?: number;
        problem_rows?: number;
        formula?: string;
        rows?: CalibrationRow[];
        error?: string;
      }
    | undefined;

  return (
    <Card
      title="Calibrate ReadinessIQ scores"
      description="Read-only. Derives a 0–100 score from the legacy 0–9 dimension scores so you can compare it against real ReadinessIQ reports before importing anything."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="cal-limit">Rows (newest first)</Label>
          <Input id="cal-limit" value={limit} onChange={e => setLimit(e.target.value)} inputMode="numeric" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="cal-email">Email filter (optional)</Label>
          <Input id="cal-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="person@company.com" />
        </div>
      </div>
      <Button
        className="mt-4"
        disabled={a.loading}
        onClick={() => a.run({ data: { limit: Math.min(Math.max(Number(limit) || 25, 1), 200), email: email.trim() || undefined } })}
      >
        {a.loading ? "Reading…" : "Run calibration"}
      </Button>

      {res?.rows?.length ? (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            {res.read} rows · formula <code className="rounded bg-muted px-1">{res.formula}</code> · stored totals found:{" "}
            {res.stored_total_found} · disagreements: {res.disagreements} · problem rows: {res.problem_rows}
          </p>
          <div className="max-h-96 overflow-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 text-foreground">
                <tr>
                  {["Email", "Product", "Dims", "Mean 0–9", "Derived", "Tier", "Stored", "Legacy label", "Report"].map(h => (
                    <th key={h} className="px-2 py-2 font-heading font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.rows.map((r, i) => (
                  <tr key={r.legacy_id ?? i} className="border-t border-border/40">
                    <td className="px-2 py-1.5">{r.email}</td>
                    <td className="px-2 py-1.5">{r.product_type ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.dimension_count}</td>
                    <td className="px-2 py-1.5">{r.mean_0_9 ?? "—"}</td>
                    <td className="px-2 py-1.5 text-foreground">{r.derived_score_100 ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.derived_tier ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.stored_total ?? "—"}</td>
                    <td className="px-2 py-1.5">{r.legacy_tier_label ?? "—"}</td>
                    <td className="px-2 py-1.5">
                      {r.report_url ? (
                        <a className="underline" href={r.report_url} target="_blank" rel="noreferrer">open</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Tier distribution: {Object.entries(res.tier_distribution ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ")}
          </p>
        </div>
      ) : (
        <Panel data={a.result} />
      )}

      <label className="mt-5 flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" className="mt-1" checked={calibrated} onChange={e => setCalibrated(e.target.checked)} />
        I compared derived scores against real ReadinessIQ reports and they match.
      </label>
    </Card>
  );
}

function MigrateCard({ run, preflight, calibrated }: {
  run: (a: { data: unknown }) => Promise<unknown>;
  preflight: () => Promise<unknown>;
  calibrated: boolean;
}) {
  const a = useAction(run as never);
  const pf = useAction(preflight as never);
  const [email, setEmail] = useState("");
  const [limit, setLimit] = useState("1000");
  const [createUsers, setCreateUsers] = useState(false);
  const [dryRunDone, setDryRunDone] = useState(false);
  const checks = pf.result as { checks?: { id: string; label: string; pass: boolean; detail: string }[]; all_pass?: boolean } | undefined;

  const args = (dry: boolean) => ({
    data: {
      dry_run: dry,
      email: email.trim() || undefined,
      limit: Math.min(Math.max(Number(limit) || 1000, 1), 5000),
      create_users: createUsers,
      confirm_calibrated: dry ? undefined : calibrated,
    },
  });

  return (
    <Card
      title="Migrate ReadinessIQ → four IQ keys"
      description="Remaps market→gtmiq, enterprise→salesiq, productization→productiq, ai→aitransformiq (anything else → readinessiq) and imports through the same path as live traffic."
    >
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        <strong className="font-heading">Standing warning.</strong> Idempotency is
        {" "}<code>(email, assessment_key, submitted_at)</code>. Importing the same submission under a
        different key creates a duplicate rather than correcting it — get the mapping right the first time.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="mg-email">Email filter (optional)</Label>
          <Input id="mg-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="person@company.com" />
        </div>
        <div>
          <Label htmlFor="mg-limit">Row limit</Label>
          <Input id="mg-limit" value={limit} onChange={e => setLimit(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={createUsers} onChange={e => setCreateUsers(e.target.checked)} />
        Also create Hub accounts (no invite email — the Hub has no SMTP)
      </label>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={a.loading}
          onClick={async () => { await a.run(args(true)); setDryRunDone(true); }}
        >
          {a.loading ? "Working…" : "Dry run"}
        </Button>
        <Button
          variant="secondary"
          disabled={a.loading || !dryRunDone || !calibrated}
          title={!calibrated ? "Tick the calibration box first" : !dryRunDone ? "Run a dry run first" : undefined}
          onClick={() => a.run(args(false))}
        >
          Run import
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {calibrated ? "Calibration confirmed." : "Import stays locked until calibration is confirmed above."}
        {dryRunDone ? " Dry run completed." : " No dry run yet this session."}
      </p>
      <Panel data={a.result} />

      <div className="mt-6">
        <Button variant="outline" onClick={() => pf.run()} disabled={pf.loading}>
          {pf.loading ? "Checking…" : "Run pre-flight checks"}
        </Button>
        {checks?.checks ? (
          <ul className="mt-4 space-y-2">
            {checks.checks.map(c => (
              <li key={c.id} className="flex gap-3 rounded-lg border border-border/60 p-3 text-sm">
                <span className={c.pass ? "text-[hsl(var(--primary))]" : "text-destructive"}>
                  {c.pass ? "PASS" : "FAIL"}
                </span>
                <span>
                  <span className="text-foreground">{c.label}</span>
                  <span className="block text-muted-foreground">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Panel data={pf.result} />
        )}
      </div>
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
