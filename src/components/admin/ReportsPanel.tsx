import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_REPORT_SETTINGS,
  SECTION_LABELS,
  mergeSettings,
  type ReportOverride,
  type ReportSettings,
} from "@/lib/report-settings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (arg?: any) => Promise<any>;

const APPS = [
  { key: "gtmiq", name: "GTMIQ" },
  { key: "salesiq", name: "SalesIQ" },
  { key: "productiq", name: "ProductIQ" },
  { key: "aitransformiq", name: "AITransformIQ" },
  { key: "uxiq", name: "UXIQ" },
  { key: "tariffiq", name: "TariffIQ" },
];

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ReportsPanel(props: {
  getSettings: Fn; saveSettings: Fn; listReports: Fn; reportAction: Fn;
  resetPreview: Fn; resetBatch: Fn; resetFinish: Fn;
}) {
  return (
    <div className="grid gap-6">
      <ReportSettingsCard getSettings={props.getSettings} saveSettings={props.saveSettings} />
      <ReportsTable listReports={props.listReports} reportAction={props.reportAction} />
      <ResetCard preview={props.resetPreview} batch={props.resetBatch} finish={props.resetFinish} />
    </div>
  );
}

function ResetCard({ preview, batch, finish }: { preview: Fn; batch: Fn; finish: Fn }) {
  const [counts, setCounts] = useState<{ people: number; results: number } | null>(null);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  const refresh = useCallback(async () => { try { setCounts(await preview()); } catch { /* shown on run */ } }, [preview]);
  useEffect(() => { void refresh(); }, [refresh]);

  const run = async () => {
    setRunning(true); setProblems([]);
    const issues: string[] = [];
    try {
      let offset = 0;
      for (;;) {
        const r = await batch({ data: { confirm: "RESET", offset } });
        for (const st of r.steps) for (const f of st.failures) issues.push(`${st.email} — ${f}`);
        setProgress(`Erasing in the assessments and HubSpot: ${r.next} of ${r.total} people…`);
        if (r.done) break;
        offset = r.next;
      }
      setProgress("Erasing results in GEM Hub Central…");
      const f = await finish({ data: { confirm: "RESET" } });
      issues.push(...f.warnings);
      setProgress(`Done. ${f.results_deleted} results erased. Accounts and plans were kept, and everyone's free trial assessment is available again.`);
    } catch (e) {
      setProgress(`Stopped: ${e instanceof Error ? e.message : String(e)}. Nothing in GEM Hub Central was erased yet; you can run it again.`);
    }
    setProblems(issues); setTyped(""); setRunning(false); void refresh();
  };

  return (
    <section className="rounded-2xl border border-destructive/40 bg-card/60 p-6">
      <h2 className="font-heading text-xl text-foreground">Reset all reports</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently erases every assessment result and report: in GEM Hub Central, inside all assessments (through their delete links),
        and the assessment fields on HubSpot contacts. Accounts, plans and HubSpot contacts are kept, and trial usage is reset. This cannot be undone.
      </p>
      {counts && <p className="mt-3 text-sm text-foreground">Currently: {counts.results} results from {counts.people} people.</p>}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="reset-confirm" className="text-xs text-muted-foreground">Type RESET to confirm</Label>
          <Input id="reset-confirm" className="h-9 w-40" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={running} />
        </div>
        <Button variant="destructive" disabled={typed !== "RESET" || running} onClick={run}>
          {running ? "Erasing…" : "Erase all reports"}
        </Button>
      </div>
      {progress && <p className="mt-4 text-sm text-foreground">{progress}</p>}
      {problems.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="text-destructive">Some steps didn't go through. Fix them, then run the reset again (it is safe to repeat):</p>
          <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5 text-muted-foreground">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

// ---------------- settings ----------------
function ReportSettingsCard({ getSettings, saveSettings }: { getSettings: Fn; saveSettings: Fn }) {
  const [all, setAll] = useState<{ global: ReportSettings; overrides: Record<string, ReportOverride> } | null>(null);
  const [scope, setScope] = useState("global");
  const [draft, setDraft] = useState<ReportSettings>(DEFAULT_REPORT_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try { setAll(await getSettings()); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  }, [getSettings]);
  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!all) return;
    setDraft(scope === "global" ? all.global : mergeSettings(all.global, all.overrides[scope]));
  }, [all, scope]);

  if (!all) return <Section title="Report settings" description={msg ?? "Loading…"}>{null}</Section>;
  const hasOverride = scope !== "global" && !!all.overrides[scope];

  const move = (i: number, d: -1 | 1) => {
    const s = [...draft.sections];
    const j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    setDraft({ ...draft, sections: s });
  };
  const setCopy = (k: keyof ReportSettings["copy"], v: string) => setDraft({ ...draft, copy: { ...draft.copy, [k]: v } });

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await saveSettings({ data: { scope, settings: draft } });
      setMsg(scope === "global" ? "Saved. Every assessment picks this up within about 5 minutes." : `Saved ${APPS.find((a) => a.key === scope)?.name}'s own settings.`);
      await reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  const reset = async () => {
    setBusy(true);
    try { await saveSettings({ data: { scope, settings: null } }); setMsg("Now follows the shared settings again."); await reload(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };

  return (
    <Section title="Report settings"
      description="Choose what every report shows, what trial users see, the wording and tier labels. Pick an assessment to give it its own settings.">
      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="rs-scope">Settings for</Label>
        <select id="rs-scope" className={sel} value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="global">All assessments (shared)</option>
          {APPS.map((a) => <option key={a.key} value={a.key}>{a.name}{all.overrides[a.key] ? " — own settings" : ""}</option>)}
        </select>
        {scope !== "global" && <span className="text-xs text-muted-foreground">{hasOverride ? "Uses its own settings." : "Currently follows the shared settings."}</span>}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Sections (top to bottom)</h3>
          <div className="space-y-1.5">
            {draft.sections.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                <input type="checkbox" id={`sec-${s.key}`} checked={s.enabled}
                  onChange={(e) => setDraft({ ...draft, sections: draft.sections.map((x) => x.key === s.key ? { ...x, enabled: e.target.checked } : x) })} />
                <label htmlFor={`sec-${s.key}`} className="flex-1 text-sm text-foreground">{SECTION_LABELS[s.key]}</label>
                <Button size="sm" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
                <Button size="sm" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === draft.sections.length - 1}>↓</Button>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Locking</h3>
          <Label htmlFor="rs-trial" className="text-xs text-muted-foreground">Trial users (before their plan starts) see</Label>
          <select id="rs-trial" className={`${sel} mt-1 w-full`} value={draft.trial_access}
            onChange={(e) => setDraft({ ...draft, trial_access: e.target.value as ReportSettings["trial_access"] })}>
            <option value="score">Score only</option>
            <option value="score_tier">Score and tier</option>
            <option value="score_tier_dimensions">Score, tier and dimension breakdown</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Everything else unlocks when their plan starts. You can unlock a single report in the results list.</p>

          <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Who builds the report</h3>
          <select className={`${sel} w-full`} value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as ReportSettings["mode"] })}>
            <option value="app">The assessment (its own report page)</option>
            <option value="hub">GEM Hub Central (one report page for all)</option>
          </select>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Wording</h3>
          {([
            ["title_pattern", "Report title — use {assessment}, {company}, {name}"],
            ["intro", "Intro line"],
            ["closing_message", "Closing message"],
            ["closing_cta", "Closing button text"],
            ["closing_url", "Closing button link"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <Label htmlFor={`rc-${k}`} className="text-xs text-muted-foreground">{label}</Label>
              <Input id={`rc-${k}`} value={draft.copy[k]} onChange={(e) => setCopy(k, e.target.value)} />
            </div>
          ))}
          <div>
            <Label htmlFor="rc-disc" className="text-xs text-muted-foreground">Disclaimer</Label>
            <Textarea id="rc-disc" rows={3} value={draft.copy.disclaimer} onChange={(e) => setCopy("disclaimer", e.target.value)} />
          </div>

          <h3 className="pt-3 text-sm font-semibold text-foreground">Tiers</h3>
          <div className="space-y-1.5">
            {draft.tiers.map((t, i) => (
              <div key={t.key} className="flex items-center gap-2">
                <Input aria-label="Tier name" className="h-8" value={t.label}
                  onChange={(e) => setDraft({ ...draft, tiers: draft.tiers.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                <Input aria-label="From score" type="number" min={0} max={100} className="h-8 w-20" value={t.min}
                  onChange={(e) => setDraft({ ...draft, tiers: draft.tiers.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x) })} />
                <input aria-label="Colour" type="color" className="h-8 w-10 rounded border border-input bg-background" value={t.color}
                  onChange={(e) => setDraft({ ...draft, tiers: draft.tiers.map((x, j) => j === i ? { ...x, color: e.target.value } : x) })} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Name · starts at score · colour</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save report settings"}</Button>
        {hasOverride && <Button variant="outline" onClick={reset} disabled={busy}>Use shared settings</Button>}
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </Section>
  );
}

// ---------------- results ----------------
type Item = {
  id: string; email: string; assessment_key: string; assessment_name: string; score: number | null; tier: string | null;
  submitted_at: string; entitlement: string | null; plan: string; locked: boolean; override: boolean | null; hidden: boolean;
  generated: boolean; last_action: { action: string; by: string; at: string } | null;
};
type Stats = { total: number; this_week: number; avg_by_iq: Record<string, number | null>; tiers: Record<string, number>; trial_reports: number; trial_converted: number };

function ReportsTable({ listReports, reportAction }: { listReports: Fn; reportAction: Fn }) {
  const [f, setF] = useState({ assessment_key: "", email: "", from: "", to: "", tier: "", lock: "all", include_hidden: false });
  const [data, setData] = useState<{ items: Item[]; stats: Stats } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== false));
      setData(await listReports({ data: { ...clean, limit: 500 } }));
      setMsg(null);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(null);
  }, [f, listReports]);
  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (id: string, action: string, label: string) => {
    if (action === "hide" && !confirm("Hide this result from the user's dashboard? Nothing is deleted.")) return;
    setBusy(`${id}:${action}`);
    try { await reportAction({ data: { id, action } }); setMsg(`${label} — done.`); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(null);
  };

  const csv = useMemo(() => {
    if (!data) return "";
    const head = ["id", "email", "assessment", "score", "tier", "submitted_at", "plan", "entitlement", "locked", "hidden"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [head.join(","), ...data.items.map((i) => [i.id, i.email, i.assessment_name, i.score, i.tier, i.submitted_at, i.plan, i.entitlement, i.locked, i.hidden].map(esc).join(","))].join("\n");
  }, [data]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `gemiq-results-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.stats;
  return (
    <Section title="All reports" description="Every result from all six assessments. Open, unlock, resend, rebuild or hide any report.">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label className="text-xs text-muted-foreground" htmlFor="rf-iq">Assessment</Label>
          <select id="rf-iq" className={`${sel} block`} value={f.assessment_key} onChange={(e) => setF({ ...f, assessment_key: e.target.value })}>
            <option value="">All</option>{APPS.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
          </select></div>
        <div><Label className="text-xs text-muted-foreground" htmlFor="rf-email">Email</Label>
          <Input id="rf-email" className="h-9 w-48" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><Label className="text-xs text-muted-foreground" htmlFor="rf-from">From</Label>
          <Input id="rf-from" type="date" className="h-9" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
        <div><Label className="text-xs text-muted-foreground" htmlFor="rf-to">To</Label>
          <Input id="rf-to" type="date" className="h-9" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        <div><Label className="text-xs text-muted-foreground" htmlFor="rf-tier">Tier</Label>
          <select id="rf-tier" className={`${sel} block`} value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>
            <option value="">All</option>{DEFAULT_REPORT_SETTINGS.tiers.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select></div>
        <div><Label className="text-xs text-muted-foreground" htmlFor="rf-lock">Report</Label>
          <select id="rf-lock" className={`${sel} block`} value={f.lock} onChange={(e) => setF({ ...f, lock: e.target.value })}>
            <option value="all">All</option><option value="locked">Locked</option><option value="unlocked">Unlocked</option>
          </select></div>
        <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
          <input type="checkbox" checked={f.include_hidden} onChange={(e) => setF({ ...f, include_hidden: e.target.checked })} /> Show hidden
        </label>
        <Button onClick={load} disabled={busy === "load"}>{busy === "load" ? "Loading…" : "Apply"}</Button>
        <Button variant="outline" onClick={download} disabled={!data?.items.length}>Export CSV</Button>
      </div>

      {s && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Results this week" value={String(s.this_week)} sub={`${s.total} in this list`} />
          <Stat label="Trial reports that became plans" value={s.trial_reports ? `${Math.round((s.trial_converted / s.trial_reports) * 100)}%` : "—"} sub={`${s.trial_converted} of ${s.trial_reports}`} />
          <Stat label="Average score" value="" sub={Object.entries(s.avg_by_iq).map(([k, v]) => `${k} ${v ?? "—"}`).join(" · ") || "—"} />
          <Stat label="Tiers" value="" sub={Object.entries(s.tiers).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"} />
        </div>
      )}

      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}

      <div className="mt-4 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="py-2 pr-3">Date</th><th className="pr-3">Email</th><th className="pr-3">Assessment</th><th className="pr-3">Score</th><th className="pr-3">Tier</th><th className="pr-3">Plan</th><th className="pr-3">Report</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data?.items.map((i) => (
              <tr key={i.id} className={`border-t border-border/50 align-top ${i.hidden ? "opacity-60" : ""}`}>
                <td className="py-2 pr-3 text-xs text-muted-foreground">{new Date(i.submitted_at).toLocaleDateString()}</td>
                <td className="pr-3">{i.email}</td>
                <td className="pr-3">{i.assessment_name}</td>
                <td className="pr-3">{i.score ?? "—"}</td>
                <td className="pr-3 capitalize">{i.tier ?? "—"}</td>
                <td className="pr-3 text-xs">{i.plan}{i.entitlement ? ` · ${i.entitlement.replace("_", " ")}` : ""}</td>
                <td className="pr-3 text-xs">
                  {i.locked ? "Locked" : "Unlocked"}{i.override != null ? " (admin)" : ""}{i.hidden ? " · hidden" : ""}
                  {i.last_action && <div className="text-muted-foreground">{i.last_action.action} by {i.last_action.by.split("@")[0]}</div>}
                </td>
                <td className="py-1">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" asChild><a href={`/report/${i.id}`} target="_blank" rel="noreferrer">Open</a></Button>
                    {i.locked
                      ? <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "unlock", "Unlocked")}>Unlock</Button>
                      : <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "relock", "Locked")}>Lock</Button>}
                    {i.override != null && <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "clear_override", "Back to normal rules")}>Reset</Button>}
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "resend", `Report link emailed to ${i.email}`)}>Resend</Button>
                    <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "regenerate", "Report text rebuilt")}>
                      {busy === `${i.id}:regenerate` ? "Writing…" : "Regenerate"}
                    </Button>
                    {i.hidden
                      ? <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "unhide", "Shown again")}>Unhide</Button>
                      : <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => act(i.id, "hide", "Hidden")}>Hide</Button>}
                  </div>
                </td>
              </tr>
            ))}
            {data && !data.items.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No results match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      {value && <div className="font-heading text-2xl text-foreground">{value}</div>}
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
