import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { onboardingPrompt, syncPrompt } from "@/lib/iq-prompts";

type Level = "info" | "warning" | "critical";
type App = {
  key: string; name: string; site_url: string; track: string; description: string | null;
  purge_url: string | null; status_url: string | null;
  lifecycle: "onboarding" | "live" | "retired"; paused: boolean;
  notice: string | null; notice_level: Level;
  onboarding_checks: Record<string, { ok: boolean; at: string; detail?: string }>;
  last_status: Health | null; last_checked_at: string | null;
};
type Global = { notice: string | null; notice_level: Level; checkout_cta: string | null; guarantee_line: string | null; trial_line: string | null };
type Health = {
  key: string; light: "green" | "yellow" | "red"; reachable: boolean;
  manifest_version: string | null; problems: string[]; checked_at: string;
};
type Fn = (a?: { data: unknown }) => Promise<unknown>;

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
      <h2 className="font-heading text-xl text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LevelSelect({ value, onChange, id }: { value: Level; onChange: (v: Level) => void; id?: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as Level)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground">
      <option value="info">Info</option>
      <option value="warning">Warning</option>
      <option value="critical">Critical</option>
    </select>
  );
}

function Light({ light }: { light?: Health["light"] }) {
  const cls = light === "green" ? "bg-success" : light === "yellow" ? "bg-accent" : light === "red" ? "bg-destructive" : "bg-muted-foreground/40";
  return <span className={`inline-block h-3 w-3 shrink-0 rounded-full ${cls}`} aria-label={light ?? "unchecked"} />;
}

function CopyButton({ text, label = "Copy prompt" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button size="sm" variant="outline" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setDone(true); setTimeout(() => setDone(false), 1500);
    }}>{done ? "Copied" : label}</Button>
  );
}

export function ControlPanels(props: {
  listApps: Fn; updateApp: Fn; updateGlobal: Fn; checkHealth: Fn; registerApp: Fn; verifyOnboarding: Fn;
}) {
  const [data, setData] = useState<{ apps: App[]; global: Global | null; manifest_version: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try { setData((await props.listApps()) as never); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [props]);
  useEffect(() => { void reload(); }, [reload]);

  if (error) return <Section title="Assessments" description="">{<p className="text-sm text-destructive">{error}</p>}</Section>;
  if (!data) return <Section title="Assessments" description="Loading…">{null}</Section>;

  return (
    <>
      <SharedSettings data={data} updateGlobal={props.updateGlobal} updateApp={props.updateApp} reload={reload} />
      <HealthPanel data={data} checkHealth={props.checkHealth} reload={reload} />
      <Onboarding data={data} registerApp={props.registerApp} verify={props.verifyOnboarding} updateApp={props.updateApp} reload={reload} />
    </>
  );
}

function SharedSettings({ data, updateGlobal, updateApp, reload }: {
  data: { apps: App[]; global: Global | null }; updateGlobal: Fn; updateApp: Fn; reload: () => Promise<void>;
}) {
  const g = data.global;
  const [form, setForm] = useState<Global>({
    notice: g?.notice ?? "", notice_level: g?.notice_level ?? "info",
    checkout_cta: g?.checkout_cta ?? "", guarantee_line: g?.guarantee_line ?? "", trial_line: g?.trial_line ?? "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const blank = (v: string | null) => (v && v.trim() ? v.trim() : null);

  return (
    <Section title="Shared settings"
      description="Changes here reach every connected assessment within about 5 minutes. Leave wording empty to use the default. Prices stay fixed because they're tied to Stripe.">
      <div className="grid gap-3">
        <Label htmlFor="g-notice">Banner on every site</Label>
        <div className="flex gap-2">
          <Input id="g-notice" value={form.notice ?? ""} placeholder="e.g. Scheduled maintenance Sunday 9–10pm ET"
            onChange={(e) => setForm({ ...form, notice: e.target.value })} />
          <LevelSelect value={form.notice_level} onChange={(v) => setForm({ ...form, notice_level: v })} />
        </div>
        <Label htmlFor="g-cta">Checkout button text</Label>
        <Input id="g-cta" value={form.checkout_cta ?? ""} placeholder="Start your 7-day trial" onChange={(e) => setForm({ ...form, checkout_cta: e.target.value })} />
        <Label htmlFor="g-guar">Guarantee line</Label>
        <Input id="g-guar" value={form.guarantee_line ?? ""} placeholder="14-day money-back guarantee." onChange={(e) => setForm({ ...form, guarantee_line: e.target.value })} />
        <Label htmlFor="g-trial">Trial line</Label>
        <Textarea id="g-trial" value={form.trial_line ?? ""} rows={2} onChange={(e) => setForm({ ...form, trial_line: e.target.value })} />
        <div>
          <Button onClick={async () => {
            try {
              await updateGlobal({ data: {
                notice: blank(form.notice), notice_level: form.notice_level,
                checkout_cta: blank(form.checkout_cta), guarantee_line: blank(form.guarantee_line), trial_line: blank(form.trial_line),
              } });
              setMsg("Saved."); await reload();
            } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
          }}>Save shared settings</Button>
          {msg && <span className="ml-3 text-sm text-muted-foreground">{msg}</span>}
        </div>
      </div>

      <h3 className="mt-8 font-heading text-lg text-foreground">Per-assessment notice and pause</h3>
      <div className="mt-3 grid gap-3">
        {data.apps.filter((a) => a.lifecycle !== "retired").map((a) => <AppControlRow key={a.key} app={a} updateApp={updateApp} reload={reload} />)}
      </div>
    </Section>
  );
}

function AppControlRow({ app, updateApp, reload }: { app: App; updateApp: Fn; reload: () => Promise<void> }) {
  const [notice, setNotice] = useState(app.notice ?? "");
  const [level, setLevel] = useState<Level>(app.notice_level);
  const [busy, setBusy] = useState(false);
  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    try { await updateApp({ data: { key: app.key, patch } }); await reload(); } finally { setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 p-3">
      <span className="w-32 font-medium text-foreground">{app.name}</span>
      <Input className="min-w-[14rem] flex-1" value={notice} placeholder="No notice" onChange={(e) => setNotice(e.target.value)} />
      <LevelSelect value={level} onChange={setLevel} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => save({ notice: notice.trim() || null, notice_level: level })}>Save notice</Button>
      <Button size="sm" variant={app.paused ? "default" : "destructive"} disabled={busy}
        onClick={() => {
          if (!app.paused && !window.confirm(`Pause ${app.name}? Visitors will see an "unavailable" screen.`)) return;
          void save({ paused: !app.paused });
        }}>{app.paused ? "Resume" : "Pause"}</Button>
    </div>
  );
}

function HealthPanel({ data, checkHealth, reload }: {
  data: { apps: App[]; manifest_version: string }; checkHealth: Fn; reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const apps = data.apps.filter((a) => a.lifecycle !== "retired");
  return (
    <Section title="Assessment health"
      description={`Asks each assessment which settings version it uses (current: ${data.manifest_version}) and whether sign-in, checkout, delete and tracking work. Apps that haven't added their status link yet show red with the prompt to paste.`}>
      <Button disabled={busy} onClick={async () => { setBusy(true); try { await checkHealth(); await reload(); } finally { setBusy(false); } }}>
        {busy ? "Checking…" : "Check all now"}
      </Button>
      <div className="mt-4 grid gap-2">
        {apps.map((a) => {
          const h = a.last_status;
          return (
            <div key={a.key} className="rounded-lg border border-border/50 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Light light={h?.light} />
                <span className="w-32 font-medium text-foreground">{a.name}</span>
                <span className="flex-1 text-sm text-muted-foreground">
                  {!h ? "Not checked yet" : h.problems.length ? h.problems.join(" · ") : `All good · settings ${h.manifest_version}`}
                </span>
                {a.last_checked_at && <span className="text-xs text-muted-foreground">{new Date(a.last_checked_at).toLocaleString()}</span>}
                {h?.light !== "green" && (
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === a.key ? null : a.key)}>
                    {open === a.key ? "Hide prompt" : "Get prompt"}
                  </Button>
                )}
              </div>
              {open === a.key && h?.light !== "green" && (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-muted-foreground">Paste this into {a.name}, publish it, then press "Check all now".</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs text-foreground/80">{syncPrompt(a, data.manifest_version)}</pre>
                  <div className="mt-2"><CopyButton text={syncPrompt(a, data.manifest_version)} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

const CHECK_LABELS: Record<string, string> = {
  status_link: "Status link answers",
  settings_current: "Uses current settings",
  delete_link: "Delete link accepts a test",
  result_received: "A test result arrived",
  posthog: "PostHog sees the site",
};

function Onboarding({ data, registerApp, verify, updateApp, reload }: {
  data: { apps: App[]; manifest_version: string }; registerApp: Fn; verify: Fn; updateApp: Fn; reload: () => Promise<void>;
}) {
  const [f, setF] = useState({ name: "", key: "", site_url: "https://", track: "capability", description: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const onboarding = data.apps.filter((a) => a.lifecycle === "onboarding");

  return (
    <Section title="Add a new assessment"
      description="Step 1: enter the details. Step 2: paste the generated prompt into the new app. Step 3: run the checks until every line is green. Step 4: send me the go-live request.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="n-name">Name</Label>
          <Input id="n-name" value={f.name} placeholder="e.g. PricingIQ"
            onChange={(e) => setF({ ...f, name: e.target.value, key: f.key || "" })} /></div>
        <div><Label htmlFor="n-key">Key (lowercase, no spaces)</Label>
          <Input id="n-key" value={f.key} placeholder={f.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "pricingiq"}
            onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} /></div>
        <div><Label htmlFor="n-url">Web address</Label>
          <Input id="n-url" value={f.site_url} onChange={(e) => setF({ ...f, site_url: e.target.value.trim() })} /></div>
        <div><Label htmlFor="n-track">Track</Label>
          <select id="n-track" value={f.track} onChange={(e) => setF({ ...f, track: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground">
            <option value="capability">Capability diagnostics</option>
            <option value="specialist">Specialist diagnostics</option>
          </select></div>
        <div className="sm:col-span-2"><Label htmlFor="n-desc">Short description</Label>
          <Textarea id="n-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <Button className="mt-4" onClick={async () => {
        const key = f.key || f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        try {
          await registerApp({ data: { key, name: f.name.trim(), site_url: f.site_url.replace(/\/$/, ""), track: f.track, description: f.description.trim() || undefined } });
          setMsg(`${f.name} registered. Its prompt is below.`);
          setF({ name: "", key: "", site_url: "https://", track: "capability", description: "" });
          await reload();
        } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
      }} disabled={!f.name.trim() || !/^https:\/\/.+\..+/.test(f.site_url)}>Register assessment</Button>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}

      {onboarding.length > 0 && <h3 className="mt-8 font-heading text-lg text-foreground">In onboarding</h3>}
      <div className="mt-3 grid gap-4">
        {onboarding.map((a) => {
          const prompt = onboardingPrompt(a, data.manifest_version);
          const checks = a.onboarding_checks ?? {};
          const allGreen = Object.keys(CHECK_LABELS).every((k) => checks[k]?.ok);
          const goLive = `Take ${a.name} (key "${a.key}", ${a.site_url}, ${a.track} track) live in GEM Hub Central: run the full catalog change checklist from AGENTS.md and mark it live in the app registry.`;
          return (
            <div key={a.key} className="rounded-lg border border-border/50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-foreground">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.site_url}</span>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-foreground">Setup prompt for {a.name}</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs text-foreground/80">{prompt}</pre>
                <div className="mt-2"><CopyButton text={prompt} /></div>
              </details>
              <div className="mt-3 grid gap-1">
                {Object.entries(CHECK_LABELS).map(([k, label]) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <Light light={checks[k] ? (checks[k].ok ? "green" : "red") : undefined} />
                    <span className="text-foreground">{label}</span>
                    {checks[k]?.detail && !checks[k].ok && <span className="text-muted-foreground">— {checks[k].detail}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={busyKey === a.key} onClick={async () => {
                  setBusyKey(a.key);
                  try { await verify({ data: { key: a.key } }); await reload(); } finally { setBusyKey(null); }
                }}>{busyKey === a.key ? "Checking…" : "Run checks"}</Button>
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!window.confirm(`Remove ${a.name} from onboarding?`)) return;
                  await updateApp({ data: { key: a.key, patch: { lifecycle: "retired" } } }); await reload();
                }}>Remove</Button>
              </div>
              {allGreen && (
                <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm text-foreground">
                  <p>All checks passed. Send me this in chat to take it live:</p>
                  <p className="mt-2 italic">{goLive}</p>
                  <div className="mt-2"><CopyButton text={goLive} label="Copy request" /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
