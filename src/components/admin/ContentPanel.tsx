import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ContentBodySchema, STARTER_CONTENT, computeScore, questionCount,
  type ContentBody, type ContentQuestion, type ContentSection,
} from "@/lib/iq-content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn = (arg?: any) => Promise<any>;

const APPS = [
  { key: "gtmiq", name: "GTMIQ" }, { key: "salesiq", name: "SalesIQ" }, { key: "productiq", name: "ProductIQ" },
  { key: "aitransformiq", name: "AITransformIQ" }, { key: "uxiq", name: "UXIQ" }, { key: "tariffiq", name: "TariffIQ" },
];

type Version = { id: string; version: number; status: "draft" | "published" | "archived"; body: ContentBody; note: string | null; created_by: string | null; created_at: string; published_at: string | null };
type Mismatch = { id: string; email: string; score: number | null; score_check: { expected?: number; reported?: number; reason?: string }; submitted_at: string };

const slug = (s: string, fallback: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || fallback;

export function ContentPanel({ versions: getVersions, action }: { versions: Fn; action: Fn }) {
  const [key, setKey] = useState("gtmiq");
  const [versions, setVersions] = useState<Version[]>([]);
  const [mismatches, setMismatches] = useState<Mismatch[]>([]);
  const [body, setBody] = useState<ContentBody | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getVersions({ data: { key } });
      setVersions(r.versions); setMismatches(r.mismatches);
      const draft = r.versions.find((v: Version) => v.status === "draft");
      const pub = r.versions.find((v: Version) => v.status === "published");
      setBody((draft ?? pub)?.body ?? null); setDirty(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load content"); }
  }, [getVersions, key]);
  useEffect(() => { setBody(null); setPreview(false); void load(); }, [load]);

  const draft = versions.find((v) => v.status === "draft");
  const published = versions.find((v) => v.status === "published");
  const name = APPS.find((a) => a.key === key)?.name ?? key;

  const run = async (act: string, extra: Record<string, unknown> = {}, ok?: string) => {
    setBusy(true);
    try {
      const r = await action({ data: { key, action: act, ...extra } });
      if (act === "import") toast.success(`Imported ${r.questions} questions in ${r.sections} sections as a draft`);
      else if (act === "publish" || act === "rollback") toast.success(`Version ${r.version} is now live in ${name}`);
      else if (ok) toast.success(ok);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "That didn't work"); }
    setBusy(false);
  };

  const saveDraft = async () => {
    if (!body) return;
    const parsed = ContentBodySchema.safeParse(body);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      toast.error(`Can't save yet: ${i?.path.join(" → ")} — ${i?.message}`);
      return;
    }
    await run("save", { body: parsed.data }, "Draft saved");
  };

  const edit = (fn: (b: ContentBody) => void) => setBody((b) => {
    if (!b) return b;
    const copy = structuredClone(b); fn(copy); setDirty(true); return copy;
  });

  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <h2 className="font-heading text-xl text-foreground">Questions, scoring and tiers</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit an assessment's questions here, save a draft, preview it, then publish. The assessment picks up a new version within about 5 minutes,
          once it has the Content prompt (Control → Assessment health).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {APPS.map((a) => <Button key={a.key} size="sm" variant={key === a.key ? "default" : "outline"} onClick={() => setKey(a.key)}>{a.name}</Button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Live: {published ? <b className="text-foreground">version {published.version}</b> : "built-in questions (nothing published yet)"}
            {draft && <> · Draft: <b className="text-foreground">version {draft.version}</b>{draft.note ? ` (${draft.note})` : ""}</>}
            {dirty && <span className="text-warning"> · unsaved changes</span>}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run("import")}>Pull current content from {name}</Button>
          {!body && <Button size="sm" variant="outline" onClick={() => { setBody(structuredClone(STARTER_CONTENT)); setDirty(true); }}>Start from blank</Button>}
          {body && <Button size="sm" disabled={busy || !dirty} onClick={saveDraft}>Save draft</Button>}
          {body && <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)}>{preview ? "Close preview" : "Preview"}</Button>}
          {draft && !dirty && <Button size="sm" disabled={busy} onClick={() => run("publish")}>Publish version {draft.version}</Button>}
          {draft && <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("discard", {}, "Draft discarded")}>Discard draft</Button>}
        </div>
      </div>

      {preview && body && <Preview body={body} />}
      {body && !preview && <Editor body={body} edit={edit} />}

      {mismatches.length > 0 && (
        <div className="rounded-2xl border border-destructive/40 bg-card/60 p-6">
          <h3 className="font-heading text-base text-foreground">Score mismatches</h3>
          <p className="mt-1 text-sm text-muted-foreground">These results reported a score that doesn't match the Hub's scoring rule for the questions version they used.</p>
          <ul className="mt-2 text-sm">
            {mismatches.map((m) => (
              <li key={m.id} className="border-t border-border py-1.5">
                {m.email} · {new Date(m.submitted_at).toLocaleDateString()} · reported {m.score_check.reported ?? m.score ?? "—"}, expected {m.score_check.expected ?? "—"}{m.score_check.reason ? ` (${m.score_check.reason})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {versions.filter((v) => v.status !== "draft").length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <h3 className="font-heading text-base text-foreground">Version history</h3>
          <ul className="mt-2 text-sm">
            {versions.filter((v) => v.status !== "draft").map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 border-t border-border py-2">
                <b className="text-foreground">Version {v.version}</b>
                <span className={v.status === "published" ? "text-success" : "text-muted-foreground"}>{v.status === "published" ? "live" : "earlier"}</span>
                <span className="text-muted-foreground">{questionCount(v.body)} questions · {v.published_at ? new Date(v.published_at).toLocaleString() : ""} · {v.created_by ?? ""}{v.note ? ` · ${v.note}` : ""}</span>
                {v.status !== "published" && <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("rollback", { version: v.version })}>Make this live again</Button>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Editor({ body, edit }: { body: ContentBody; edit: (fn: (b: ContentBody) => void) => void }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <Label className="text-xs">Intro shown before the first question</Label>
        <Textarea rows={2} value={body.intro ?? ""} onChange={(e) => edit((b) => { b.intro = e.target.value; })} />
      </div>

      {body.sections.map((s, si) => (
        <SectionEditor key={si} s={s} si={si} edit={edit} total={body.sections.length} />
      ))}
      <Button variant="outline" onClick={() => edit((b) => {
        const n = b.sections.length + 1;
        b.sections.push({ key: `section_${n}`, title: `Section ${n}`, weight: 1, questions: [structuredClone(STARTER_CONTENT.sections[0].questions[0])] });
      })}>Add section</Button>

      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <h3 className="font-heading text-base text-foreground">Tiers and recommendations</h3>
        <p className="mt-1 text-xs text-muted-foreground">A score belongs to the highest tier whose starting score it reaches. Recommendations: one per line.</p>
        <div className="mt-3 grid gap-3">
          {body.tiers.map((t, ti) => (
            <div key={ti} className="grid gap-2 md:grid-cols-[1fr_110px_2fr_auto]">
              <Input value={t.label} aria-label="Tier name" onChange={(e) => edit((b) => { b.tiers[ti].label = e.target.value; })} />
              <Input type="number" min={0} max={100} aria-label="Starts at score" value={t.min} onChange={(e) => edit((b) => { b.tiers[ti].min = Number(e.target.value) || 0; })} />
              <Textarea rows={2} placeholder="Recommendations for this tier, one per line"
                value={(body.tier_recommendations[t.key] ?? []).join("\n")}
                onChange={(e) => edit((b) => { b.tier_recommendations[t.key] = e.target.value.split("\n").filter((l) => l.trim()); })} />
              <Button size="sm" variant="ghost" disabled={body.tiers.length <= 1} onClick={() => edit((b) => { b.tiers.splice(ti, 1); })}>Remove</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="w-fit" onClick={() => edit((b) => { b.tiers.push({ key: `tier_${b.tiers.length + 1}`, label: "New tier", min: 100 }); })}>Add tier</Button>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ s, si, edit, total }: { s: ContentSection; si: number; edit: (fn: (b: ContentBody) => void) => void; total: number }) {
  const [open, setOpen] = useState(si === 0);
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48"><Label className="text-xs">Section title</Label>
          <Input value={s.title} onChange={(e) => edit((b) => { b.sections[si].title = e.target.value; if (!b.sections[si].key) b.sections[si].key = slug(e.target.value, `section_${si + 1}`); })} /></div>
        <div><Label className="text-xs">Weight</Label><Input type="number" min={0} className="w-20" value={s.weight} onChange={(e) => edit((b) => { b.sections[si].weight = Number(e.target.value) || 0; })} /></div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>{open ? "Collapse" : `Show ${s.questions.length} questions`}</Button>
        <Button size="sm" variant="ghost" disabled={si === 0} onClick={() => edit((b) => { [b.sections[si - 1], b.sections[si]] = [b.sections[si], b.sections[si - 1]]; })}>Move up</Button>
        <Button size="sm" variant="ghost" disabled={total <= 1} onClick={() => edit((b) => { b.sections.splice(si, 1); })}>Remove</Button>
      </div>
      {open && (
        <div className="mt-4 grid gap-4">
          <Textarea rows={2} placeholder="Section description (optional)" value={s.description ?? ""} onChange={(e) => edit((b) => { b.sections[si].description = e.target.value; })} />
          {s.questions.map((q, qi) => <QuestionEditor key={qi} q={q} si={si} qi={qi} edit={edit} count={s.questions.length} />)}
          <Button size="sm" variant="outline" className="w-fit" onClick={() => edit((b) => {
            const qs = b.sections[si].questions; const n = qs.length + 1;
            qs.push({ ...structuredClone(STARTER_CONTENT.sections[0].questions[0]), key: `${b.sections[si].key}_q${n}_${Date.now() % 10000}` });
          })}>Add question</Button>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ q, si, qi, edit, count }: { q: ContentQuestion; si: number; qi: number; edit: (fn: (b: ContentBody) => void) => void; count: number }) {
  const at = (b: ContentBody) => b.sections[si].questions[qi];
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-64"><Label className="text-xs">Question {qi + 1}</Label><Input value={q.text} onChange={(e) => edit((b) => { at(b).text = e.target.value; })} /></div>
        <div><Label className="text-xs">Weight</Label><Input type="number" min={0} className="w-20" value={q.weight} onChange={(e) => edit((b) => { at(b).weight = Number(e.target.value) || 0; })} /></div>
        <Button size="sm" variant="ghost" disabled={count <= 1} onClick={() => edit((b) => { b.sections[si].questions.splice(qi, 1); })}>Remove</Button>
      </div>
      <Input className="mt-2" placeholder="Help text (optional)" value={q.help ?? ""} onChange={(e) => edit((b) => { at(b).help = e.target.value; })} />
      <div className="mt-3 grid gap-2">
        {q.options.map((o, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <Input value={o.label} aria-label="Answer" onChange={(e) => edit((b) => { at(b).options[oi].label = e.target.value; })} />
            <Input type="number" min={0} max={100} className="w-24" aria-label="Points" value={o.points} onChange={(e) => edit((b) => { at(b).options[oi].points = Math.min(100, Math.max(0, Number(e.target.value) || 0)); })} />
            <span className="text-xs text-muted-foreground">pts</span>
            <Button size="sm" variant="ghost" disabled={q.options.length <= 2} onClick={() => edit((b) => { at(b).options.splice(oi, 1); })}>×</Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="w-fit" disabled={q.options.length >= 10} onClick={() => edit((b) => {
          const opts = at(b).options; opts.push({ key: `o${opts.length + 1}_${Date.now() % 1000}`, label: "New answer", points: 0 });
        })}>Add answer</Button>
      </div>
    </div>
  );
}

function Preview({ body }: { body: ContentBody }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const result = useMemo(() => computeScore(body, answers), [body, answers]);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="grid gap-4">
        {body.intro && <p className="text-sm text-muted-foreground">{body.intro}</p>}
        {body.sections.map((s) => (
          <div key={s.key} className="rounded-2xl border border-border bg-card/60 p-6">
            <h3 className="font-heading text-lg text-foreground">{s.title}</h3>
            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
            {s.questions.map((q) => (
              <fieldset key={q.key} className="mt-4">
                <legend className="text-sm text-foreground">{q.text}</legend>
                {q.help && <p className="text-xs text-muted-foreground">{q.help}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <Button key={o.key} size="sm" variant={answers[q.key] === o.key ? "default" : "outline"}
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: o.key }))}>{o.label}</Button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        ))}
      </div>
      <aside className="h-fit rounded-2xl border border-border bg-card/60 p-6 lg:sticky lg:top-4">
        <p className="text-xs text-muted-foreground">Preview score</p>
        <p className="font-heading text-4xl text-foreground">{result.score ?? "—"}</p>
        <p className="text-sm text-foreground">{result.tierLabel ?? "Answer a question"}</p>
        <ul className="mt-3 text-sm text-muted-foreground">
          {body.sections.map((s) => <li key={s.key}>{s.title}: {result.sections[s.key] ?? "—"}</li>)}
        </ul>
        {result.tier && (body.tier_recommendations[result.tier] ?? []).length > 0 && (
          <ul className="mt-3 list-disc pl-4 text-xs text-foreground/80">
            {(body.tier_recommendations[result.tier] ?? []).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
        <Button size="sm" variant="ghost" className="mt-3" onClick={() => setAnswers({})}>Clear answers</Button>
      </aside>
    </div>
  );
}
