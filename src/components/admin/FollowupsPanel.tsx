import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FOLLOWUP_STEPS, STEP_LABELS, mergeRules,
  type FollowupOverride, type FollowupRules, type FollowupStep, type FollowupStepKey,
} from "@/lib/followups";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (arg?: any) => Promise<any>;

const SCOPES = [
  { key: "global", name: "All assessments" },
  { key: "gtmiq", name: "GTMIQ" }, { key: "salesiq", name: "SalesIQ" }, { key: "productiq", name: "ProductIQ" },
  { key: "aitransformiq", name: "AITransformIQ" }, { key: "uxiq", name: "UXIQ" }, { key: "tariffiq", name: "TariffIQ" },
];

type LogItem = { id: string; email: string; assessment_key: string; step: FollowupStepKey; send_at: string; status: string; sent_at: string | null; error: string | null };
type Data = { global: FollowupRules; overrides: Record<string, FollowupOverride>; log: { items: LogItem[]; stats: { pending: number; sent: number; unsubscribed: number } } };

export function FollowupsPanel({ get, save, test }: { get: Fn; save: Fn; test: Fn }) {
  const [data, setData] = useState<Data | null>(null);
  const [scope, setScope] = useState("global");
  const [rules, setRules] = useState<FollowupRules | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setData(await get()); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load follow-ups"); }
  }, [get]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    setRules(scope === "global" ? data.global : mergeRules(data.global, data.overrides[scope]));
  }, [data, scope]);

  const hasOverride = scope !== "global" && !!data?.overrides[scope];
  const setStep = (k: FollowupStepKey, patch: Partial<FollowupStep>) => setRules((r) => (r ? { ...r, [k]: { ...r[k], ...patch } } : r));

  const onSave = async (reset = false) => {
    if (!rules) return;
    setBusy(true);
    try {
      await save({ data: { scope, rules: reset ? null : rules } });
      toast.success(reset ? "Now uses the settings for all assessments" : "Follow-up emails saved");
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  };

  const onTest = async (k: FollowupStepKey) => {
    try { await save({ data: { scope, rules } }); await test({ data: { scope, step: k } }); toast.success("Test email sent to you"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); }
  };

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl text-foreground">Follow-up emails</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sent automatically after each result. Placeholders: {"{name}"}, {"{assessment}"}, {"{score}"}, {"{tier}"}. Every email has an unsubscribe link.
          </p>
        </div>
        {data && (
          <div className="flex gap-4 text-sm">
            <span><b className="text-foreground">{data.log.stats.pending}</b> <span className="text-muted-foreground">waiting</span></span>
            <span><b className="text-foreground">{data.log.stats.sent}</b> <span className="text-muted-foreground">sent</span></span>
            <span><b className="text-foreground">{data.log.stats.unsubscribed}</b> <span className="text-muted-foreground">unsubscribed</span></span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Button key={s.key} size="sm" variant={scope === s.key ? "default" : "outline"} onClick={() => setScope(s.key)}>
            {s.name}{s.key !== "global" && data?.overrides[s.key] ? " •" : ""}
          </Button>
        ))}
      </div>
      {scope !== "global" && (
        <p className="mt-2 text-xs text-muted-foreground">
          {hasOverride ? "This assessment has its own emails." : "Uses the settings for all assessments until you save changes here."}
        </p>
      )}

      {rules && (
        <div className="mt-5 grid gap-5">
          {FOLLOWUP_STEPS.map((k) => {
            const st = rules[k];
            return (
              <div key={k} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Switch checked={st.enabled} onCheckedChange={(v) => setStep(k, { enabled: v })} aria-label={`Turn ${STEP_LABELS[k].title} on or off`} />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{STEP_LABELS[k].title}</p>
                    <p className="text-xs text-muted-foreground">{STEP_LABELS[k].who}</p>
                  </div>
                  <Label className="text-xs text-muted-foreground">Days after result</Label>
                  <Input type="number" min={0} max={365} className="h-8 w-20" value={st.delay_days}
                    onChange={(e) => setStep(k, { delay_days: Math.max(0, Number(e.target.value) || 0) })} />
                  <Button size="sm" variant="ghost" onClick={() => onTest(k)}>Send me a test</Button>
                </div>
                {st.enabled && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div><Label className="text-xs">Subject</Label><Input value={st.subject} onChange={(e) => setStep(k, { subject: e.target.value })} /></div>
                    <div><Label className="text-xs">Heading</Label><Input value={st.heading} onChange={(e) => setStep(k, { heading: e.target.value })} /></div>
                    {k === "tier_advice" ? (
                      <>
                        <div><Label className="text-xs">Text for scores under 40</Label><Textarea rows={4} value={st.body_low ?? ""} onChange={(e) => setStep(k, { body_low: e.target.value })} /></div>
                        <div><Label className="text-xs">Text for scores 40–69</Label><Textarea rows={4} value={st.body_mid ?? ""} onChange={(e) => setStep(k, { body_mid: e.target.value })} /></div>
                        <div><Label className="text-xs">Text for scores 70 and up</Label><Textarea rows={4} value={st.body_high ?? ""} onChange={(e) => setStep(k, { body_high: e.target.value })} /></div>
                      </>
                    ) : (
                      <div className="md:col-span-2"><Label className="text-xs">Text</Label><Textarea rows={3} value={st.body} onChange={(e) => setStep(k, { body: e.target.value })} /></div>
                    )}
                    <div><Label className="text-xs">Button text</Label><Input value={st.button_label} onChange={(e) => setStep(k, { button_label: e.target.value })} /></div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => onSave(false)}>Save follow-up emails</Button>
            {hasOverride && <Button variant="outline" disabled={busy} onClick={() => onSave(true)}>Use settings for all assessments</Button>}
          </div>
        </div>
      )}

      {data && data.log.items.length > 0 && (
        <div className="mt-6">
          <h3 className="font-heading text-base text-foreground">Recent and upcoming</h3>
          <div className="mt-2 max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Email</th><th>Assessment</th><th>Email type</th><th>When</th><th>Status</th></tr></thead>
              <tbody>
                {data.log.items.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="py-1.5">{i.email}</td>
                    <td>{i.assessment_key}</td>
                    <td>{STEP_LABELS[i.step]?.title ?? i.step}</td>
                    <td>{new Date(i.sent_at ?? i.send_at).toLocaleDateString()}</td>
                    <td className={i.status === "failed" ? "text-destructive" : i.status === "sent" ? "text-success" : "text-muted-foreground"} title={i.error ?? ""}>
                      {i.status === "pending" ? "waiting" : i.status}{i.error ? ` — ${i.error}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
