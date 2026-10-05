import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminCard } from "@/components/admin/ui";
import { computeComposite, type CompositeSettings, type Methodology } from "@/lib/composite";

type Data = { settings: CompositeSettings; methodology: Methodology; updated_at: string | null; apps: { key: string; name: string }[] };

const METH_FIELDS: [keyof Methodology, string][] = [
  ["overview", "What GEM.IQ measures"],
  ["scoring", "How scores are calculated"],
  ["maturity_model", "The maturity stages"],
  ["data_sources", "Research and sources"],
  ["how_to_read", "How to read your results"],
];

export function CompositePanel({ load, save }: { load: () => Promise<Data>; save: (a: { data: { settings?: CompositeSettings; methodology?: Methodology } }) => Promise<unknown> }) {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<Record<string, string>>({});

  useEffect(() => { load().then(setData).catch((e) => toast.error((e as Error).message)); }, [load]);

  const preview = useMemo(() => {
    if (!data) return null;
    const latest = Object.entries(sample).filter(([, v]) => v !== "").map(([k, v]) => ({ assessment_key: k, score: Number(v) }));
    return computeComposite(latest, data.apps.map((a) => a.key), data.settings);
  }, [data, sample]);

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const s = data.settings;
  const setS = (fn: (x: CompositeSettings) => void) => setData((d) => { if (!d) return d; const n = structuredClone(d); fn(n.settings); return n; });
  const doSave = async (part: "settings" | "methodology") => {
    setBusy(true);
    try { await save({ data: part === "settings" ? { settings: data.settings } : { methodology: data.methodology } }); toast.success("Saved"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const totalW = data.apps.reduce((n, a) => n + (s.weights[a.key] ?? 1), 0) || 1;

  return (
    <div className="grid gap-6">
      <AdminCard title="How much each assessment counts" description="The combined GEM.IQ score is a weighted average of each customer's latest score in every assessment they've taken. Set an assessment to 0 to leave it out.">
        <div className="grid gap-2">
          {data.apps.map((a) => {
            const w = s.weights[a.key] ?? 1;
            return (
              <div key={a.key} className="grid grid-cols-[1fr_100px_70px] items-center gap-3 text-sm">
                <span className="text-foreground">{a.name}</span>
                <Input type="number" min={0} max={100} step={0.25} aria-label={`${a.name} weight`} value={w}
                  onChange={(e) => setS((x) => { x.weights[a.key] = Math.max(0, Number(e.target.value) || 0); })} />
                <span className="text-xs text-muted-foreground">{Math.round((w / totalW) * 100)}%</span>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid gap-2 sm:max-w-xs">
          <Label className="text-xs">Assessments needed before the overall stage shows</Label>
          <Input type="number" min={1} max={data.apps.length} value={s.min_for_tier} onChange={(e) => setS((x) => { x.min_for_tier = Math.max(1, Math.round(Number(e.target.value) || 1)); })} />
        </div>
        <h3 className="mt-6 font-heading text-base text-foreground">Combined stages</h3>
        <div className="mt-2 grid gap-2">
          {s.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_110px] gap-2">
              <Input aria-label="Stage name" value={t.label} onChange={(e) => setS((x) => { x.tiers[i].label = e.target.value; })} />
              <Input type="number" aria-label="Starts at" min={0} max={100} value={t.min} onChange={(e) => setS((x) => { x.tiers[i].min = Number(e.target.value) || 0; })} />
            </div>
          ))}
        </div>
        <Button className="mt-5" disabled={busy} onClick={() => doSave("settings")}>Save combined score settings</Button>
      </AdminCard>

      <AdminCard title="Try it" description="Type some example scores to see the combined result a customer would get.">
        <div className="grid gap-2 sm:grid-cols-3">
          {data.apps.map((a) => (
            <div key={a.key}><Label className="text-xs">{a.name}</Label>
              <Input type="number" min={0} max={100} placeholder="not taken" value={sample[a.key] ?? ""} onChange={(e) => setSample((p) => ({ ...p, [a.key]: e.target.value }))} /></div>
          ))}
        </div>
        {preview && (
          <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
            Combined score <strong>{preview.score ?? "—"}</strong> · {preview.completed} of {preview.total} complete ·{" "}
            {preview.tierLabel ? <>stage <strong>{preview.tierLabel}</strong></> : `stage shows after ${preview.needed_for_tier} more`}
            {preview.next ? <> · next suggested: <strong>{data.apps.find((a) => a.key === preview.next)?.name}</strong></> : null}
          </p>
        )}
      </AdminCard>

      <AdminCard title="General GEM.IQ methodology" description="Shown on every report and on the public Methodology page. Each assessment's own methodology is edited in Questions & scoring.">
        <div className="grid gap-4">
          {METH_FIELDS.map(([k, label]) => (
            <div key={k}><Label className="text-xs">{label}</Label>
              <Textarea rows={3} value={data.methodology[k]} onChange={(e) => setData((d) => d && { ...d, methodology: { ...d.methodology, [k]: e.target.value } })} /></div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button disabled={busy} onClick={() => doSave("methodology")}>Save methodology</Button>
          <Button variant="outline" asChild><a href="/methodology" target="_blank" rel="noreferrer">Open public page</a></Button>
        </div>
      </AdminCard>
    </div>
  );
}
