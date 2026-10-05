import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { E2eCheck, E2eRun, E2eSettings, E2eWorkflow } from "@/lib/e2e";

type Overview = {
  settings: E2eSettings;
  runs: E2eRun[];
  assessments: { key: string; name: string }[];
};
type Fn<I, O> = (a: { data: I }) => Promise<O>;

const STATUS_CLS: Record<string, string> = {
  pass: "bg-primary/15 text-primary",
  fail: "bg-destructive/15 text-destructive",
  running: "bg-accent text-accent-foreground",
  started: "bg-accent text-accent-foreground",
  pending: "bg-accent text-accent-foreground",
  skip: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  pass: "Passed", fail: "Failed", running: "Waiting", started: "Started", pending: "Waiting", skip: "Skipped",
};

function Badge({ s }: { s: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[s] ?? STATUS_CLS.skip}`}>{STATUS_LABEL[s] ?? s}</span>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function copy(text: string, what: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`${what} copied`);
}

function Checks({ checks }: { checks: E2eCheck[] }) {
  if (!checks?.length) return <p className="text-xs text-muted-foreground">No checks yet.</p>;
  return (
    <ul className="grid gap-1 text-xs">
      {checks.map((c) => (
        <li key={c.key} className="flex items-start gap-2">
          <Badge s={c.status} />
          <span className="text-foreground">{c.label}</span>
          {c.detail ? <span className="break-all text-muted-foreground">— {c.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function TestsPanel({ overview, action, saveSettings }: {
  overview: () => Promise<Overview>;
  action: Fn<{ action: string; key?: string; id?: string }, unknown>;
  saveSettings: Fn<Omit<E2eSettings, "last_cleanup_at" | "updated_at" | "updated_by">, E2eSettings>;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await overview()); } catch (e) { toast.error((e as Error).message); }
  }, [overview]);
  useEffect(() => { load(); }, [load]);

  const latest = useMemo(() => {
    const m = new Map<string, E2eRun>();
    for (const r of data?.runs ?? []) if (!m.has(r.assessment_key)) m.set(r.assessment_key, r);
    return m;
  }, [data]);

  const act = async (label: string, input: { action: string; key?: string; id?: string }) => {
    setBusy(label);
    try {
      const out = await action({ data: input }) as Record<string, unknown>;
      if (input.action === "quick") {
        toast.success("Test result sent — checking HubSpot in 20 seconds");
        await load();
        setTimeout(async () => { await action({ data: { action: "check", id: out.run_id as string } }).catch(() => {}); load(); }, 20_000);
      } else if (input.action.startsWith("cleanup")) {
        toast.success(`Removed ${out.cleaned} test contact(s). ${out.remaining ? `${out.remaining} left — press again.` : ""}`);
      }
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!data) return <p className="text-muted-foreground">Loading tests…</p>;

  return (
    <div className="grid gap-6">
      <Section title="Assessment tests" description="Latest test per assessment. A quick test sends a result straight to the Hub and checks HubSpot.">
        <div className="grid gap-3">
          {data.assessments.map((a) => {
            const r = latest.get(a.key);
            return (
              <div key={a.key} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-foreground">{a.name}</span>
                    {r ? <Badge s={r.status} /> : <span className="text-xs text-muted-foreground">Not tested yet</span>}
                    {r ? <span className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={!!busy} onClick={() => act(`q-${a.key}`, { action: "quick", key: a.key })}>
                      {busy === `q-${a.key}` ? "Sending…" : "Run quick test"}
                    </Button>
                    {r && (r.status === "running" || r.status === "started") ? (
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(`c-${r.id}`, { action: "check", id: r.id })}>Check again</Button>
                    ) : null}
                    {r ? <Button size="sm" variant="ghost" onClick={() => setOpen(open === a.key ? null : a.key)}>{open === a.key ? "Hide" : "Details"}</Button> : null}
                  </div>
                </div>
                {r && open === a.key ? (
                  <div className="mt-3 grid gap-2">
                    <p className="text-xs text-muted-foreground">Test address: {r.email}{r.cleaned_at ? " (cleaned up)" : ""}</p>
                    <Checks checks={r.checks} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>


      <SettingsCard settings={data.settings} assessments={data.assessments} save={saveSettings} onSaved={load} />

      <Section title="Clean up test contacts" description={`Test contacts are deleted everywhere (Hub, assessments, HubSpot, Stripe) after ${data.settings.keep_days} days, once a day.${data.settings.last_cleanup_at ? ` Last run ${new Date(data.settings.last_cleanup_at).toLocaleString()}.` : ""} Only test addresses are ever touched.`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!busy} onClick={() => act("cleanup", { action: "cleanup" })}>{busy === "cleanup" ? "Cleaning…" : "Clean up old ones now"}</Button>
          <Button variant="destructive" disabled={!!busy} onClick={() => { if (window.confirm("Delete every test contact now, including today's?")) act("cleanup_all", { action: "cleanup_all" }); }}>
            {busy === "cleanup_all" ? "Cleaning…" : "Clean up all test contacts"}
          </Button>
        </div>
      </Section>

      <Section title="Test history" description="Every run, newest first.">
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground"><tr><th className="py-1">When</th><th>Assessment</th><th>Result</th><th>Failing</th></tr></thead>
            <tbody>
              {data.runs.map((r) => (
                <tr key={r.id} className="border-t border-border/50 align-top">
                  <td className="py-1.5">{new Date(r.started_at).toLocaleString()}</td>
                  <td>{data.assessments.find((a) => a.key === r.assessment_key)?.name ?? r.assessment_key}</td>
                                    <td><Badge s={r.status} /></td>
                  <td className="text-muted-foreground">{(r.checks ?? []).filter((c) => c.status === "fail" || c.status === "pending").map((c) => c.label).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function SettingsCard({ settings, assessments, save, onSaved }: {
  settings: E2eSettings;
  assessments: { key: string; name: string }[];
  save: Fn<Omit<E2eSettings, "last_cleanup_at" | "updated_at" | "updated_by">, E2eSettings>;
  onSaved: () => void;
}) {
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(settings), [settings]);
  const setWf = (i: number, patch: Partial<E2eWorkflow>) => setS({ ...s, workflows: s.workflows.map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  const [local, domain] = s.base_email.split("@");

  return (
    <Section title="Test settings" description="The inbox test emails go to, and which HubSpot workflows each test contact must join.">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="e2e-base">Inbox for test emails</Label>
            <Input id="e2e-base" value={s.base_email} onChange={(e) => setS({ ...s, base_email: e.target.value.trim() })} />
            <p className="mt-1 text-xs text-muted-foreground">Test addresses look like {local}+gemtest-tariffiq-…@{domain}</p>
          </div>
          <div>
            <Label htmlFor="e2e-keep">Keep test contacts for (days)</Label>
            <Input id="e2e-keep" type="number" min={0} max={60} value={s.keep_days} onChange={(e) => setS({ ...s, keep_days: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <Label>Assessments to test (none ticked = all)</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {assessments.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={s.assessments.includes(a.key)}
                  onChange={(e) => setS({ ...s, assessments: e.target.checked ? [...s.assessments, a.key] : s.assessments.filter((k) => k !== a.key) })} />
                {a.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>HubSpot workflows each test contact must join</Label>
          <div className="mt-2 grid gap-2">
            {s.workflows.map((w, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input className="min-w-64 flex-1" value={w.name} onChange={(e) => setWf(i, { name: e.target.value })} />
                <select className="rounded-md border border-input bg-background px-2 py-2 text-sm" value={w.when} onChange={(e) => setWf(i, { when: e.target.value as E2eWorkflow["when"] })}>
                  <option value="always">Every result</option>
                  <option value="trial">Trial results only</option>
                </select>
                <Button size="sm" variant="ghost" onClick={() => setS({ ...s, workflows: s.workflows.filter((_, j) => j !== i) })}>Remove</Button>
              </div>
            ))}
            <div>
              <Button size="sm" variant="outline" onClick={() => setS({ ...s, workflows: [...s.workflows, { name: "GEM.IQ - ", when: "always" }] })}>Add workflow</Button>
            </div>
          </div>
        </div>
        <div>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              await save({ data: { enabled: s.enabled, base_email: s.base_email, keep_days: s.keep_days, assessments: s.assessments, workflows: s.workflows } });
              toast.success("Test settings saved");
              onSaved();
            } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
          }}>{saving ? "Saving…" : "Save settings"}</Button>
        </div>
      </div>
    </Section>
  );
}
