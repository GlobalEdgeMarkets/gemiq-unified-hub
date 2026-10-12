// Admin → Brand → Messaging: edit the shared brand wording set, preview per property,
// publish numbered versions, roll back, and manage publish hooks.
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminMessagingAction, adminMessagingOverview } from "@/lib/admin.functions";
import {
  PROPERTIES, PROPERTY_LABEL, RELATED_KEYS, SCOPES, STATUSES, STATUS_LABEL, BodySchema,
  effectiveSet, findAvoidTerms, publicPayload,
  type MessagingBody, type MessagingItem, type Property, type Scope, type ItemStatus,
} from "@/lib/messaging";
import { AdminCard, ResultList, StatusChip, type ChipState } from "./ui";

type Version = { id: string; version: number; status: "draft" | "published" | "archived"; body: MessagingBody; note: string | null; created_by: string | null; created_at: string; published_at: string | null };
type Hook = { url: string; enabled: boolean; label?: string };
type Overview = { versions: Version[]; settings: { publish_hooks: Hook[]; last_hook_results: { at: string; results: { ok: boolean; text: string }[] } | null } };

const STATUS_CHIP: Record<ItemStatus, ChipState> = { approved: "ok", draft: "idle", needs_input: "warn" };
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
const input = "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";
const btn = "rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50";
const primary = "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";

export function MessagingPanel() {
  const load = useServerFn(adminMessagingOverview);
  const act = useServerFn(adminMessagingAction);
  const [data, setData] = useState<Overview | null>(null);
  const [body, setBody] = useState<MessagingBody | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Scope>("shared");
  const [filter, setFilter] = useState<ItemStatus | "all">("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"items" | "preview" | "rules" | "history" | "hooks">("items");
  const [result, setResult] = useState<{ heading: string; ok: boolean; items: { ok: boolean; text: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const draft = data?.versions.find((v) => v.status === "draft") ?? null;
  const live = data?.versions.find((v) => v.status === "published") ?? null;

  async function refresh(resetBody = true) {
    const d = (await load()) as Overview;
    setData(d);
    if (resetBody) {
      const src = d.versions.find((v) => v.status === "draft") ?? d.versions.find((v) => v.status === "published");
      setBody(src ? structuredClone(src.body) : { items: [], vocabulary: [] });
      setDirty(false);
    }
  }
  useEffect(() => { refresh().catch((e) => setResult({ heading: (e as Error).message, ok: false, items: [] })); }, []);

  async function run(label: string, fn: () => Promise<unknown>, reload = true) {
    setBusy(true); setResult(null);
    try {
      const r = (await fn()) as { version?: number; changed?: string[]; hooks?: { ok: boolean; text: string }[] } | undefined;
      const items: { ok: boolean; text: string }[] = [];
      if (r?.changed) items.push({ ok: true, text: r.changed.length ? `Changed for: ${r.changed.map((p) => PROPERTY_LABEL[p as Property]).join(", ")}` : "No visible change for any site" });
      for (const h of r?.hooks ?? []) items.push(h);
      setResult({ heading: r?.version ? `${label} — version ${r.version} is live` : label, ok: true, items });
      if (reload) await refresh();
    } catch (e) {
      setResult({ heading: (e as Error).message.replace(/^.*?:\s(?=[A-Z"])/, ""), ok: false, items: [] });
    } finally { setBusy(false); }
  }

  function update(fn: (b: MessagingBody) => void) {
    if (!body) return;
    const next = structuredClone(body); fn(next); setBody(next); setDirty(true);
  }

  const counts = useMemo(() => {
    if (!body) return null;
    const changes = draft && live ? diffCount(live.body, body) : null;
    return { changes };
  }, [body, draft, live]);

  if (!data || !body) return <p className="text-sm text-muted-foreground">Loading messaging…</p>;

  const validation = BodySchema.safeParse(body);
  const rows: { item: MessagingItem; idx: number; tag: string }[] = (() => {
    if (tab === "shared") return body.items.map((item, idx) => ({ item, idx, tag: "Shared" })).filter((r) => r.item.scope === "shared");
    return effectiveSet(body, tab as Property).map((e) => {
      const idx = body.items.findIndex((i) => i.scope === e.scope && i.key === e.key);
      return { item: body.items[idx], idx, tag: e.source === "shared" ? "Shared" : e.overrides ? "Overrides shared" : "Own" };
    });
  })().filter((r) => (filter === "all" || r.item.status === filter)
    && (!q || `${r.item.key} ${r.item.label} ${r.item.value}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.item.order - b.item.order);

  function move(idx: number, dir: -1 | 1) {
    const sorted = rows.map((r) => r.idx);
    const pos = sorted.indexOf(idx); const other = sorted[pos + dir];
    if (other == null) return;
    update((b) => { const t = b.items[idx].order; b.items[idx].order = b.items[other].order; b.items[other].order = t === b.items[other].order ? t + dir : t; });
  }
  function addItem() {
    const max = Math.max(0, ...body!.items.map((i) => i.order));
    update((b) => { b.items.push({ key: "new.item", scope: tab, label: "", value: "", notes: "", status: "draft", order: max + 10, related: null }); });
  }

  return (
    <div className="grid gap-6">
      <AdminCard title="Messaging set"
        description={`Live: ${live ? `version ${live.version}, published ${fmt(live.published_at)} by ${live.created_by ?? "—"}` : "nothing published yet"}. ${draft ? `Draft: version ${draft.version}${counts?.changes != null ? ` — ${counts.changes} change${counts.changes === 1 ? "" : "s"} since live` : ""}.` : "No draft."}`}
        action={<div className="flex flex-wrap gap-2">
          <button className={btn} disabled={busy || !dirty || !validation.success} onClick={() => run("Draft saved", () => act({ data: { action: "save", body } }))}>Save draft</button>
          <button className={primary} disabled={busy || !draft || dirty} title={dirty ? "Save the draft first" : undefined}
            onClick={() => confirm(`Publish draft version ${draft?.version}? Approved items go live on the sites within about 5 minutes.`) && run("Published", () => act({ data: { action: "publish" } }))}>Publish</button>
          <button className={btn} disabled={busy || (!draft && !dirty)} onClick={() => confirm("Throw away the draft?") && run("Draft discarded", () => draft ? act({ data: { action: "discard" } }) : Promise.resolve(undefined))}>Discard draft</button>
        </div>}>
        {!validation.success ? <p className="text-sm text-destructive">✗ {validation.error.issues[0]?.message} — fix this before saving.</p> : null}
        {dirty ? <p className="text-sm text-muted-foreground">You have unsaved changes.</p> : null}
        {result ? <ResultList {...result} /> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["items", "preview", "rules", "history", "hooks"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 text-sm ${view === v ? "bg-primary/15 font-medium text-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {{ items: "Items", preview: "Preview", rules: "Wording rules", history: "History", hooks: "Publish hook" }[v]}
            </button>
          ))}
        </div>
      </AdminCard>

      {view === "items" && (
        <AdminCard title="Items" description="A site's set is the Shared items plus its own; its own item wins on the same key. Only Approved items appear on the public link.">
          <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
            {SCOPES.map((s) => (
              <button key={s} onClick={() => setTab(s)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === s ? "bg-primary/15 font-medium text-foreground" : "text-muted-foreground hover:bg-muted"}`}>{PROPERTY_LABEL[s]}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className={`${input} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as ItemStatus | "all")}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <input className={`${input} max-w-xs`} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={btn} onClick={addItem}>Add item</button>
          </div>
          <div className="mt-4 grid gap-3">
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">No items here.</p> : null}
            {rows.map(({ item, idx, tag }) => {
              const warnings = findAvoidTerms(item.value, body.vocabulary);
              const inherited = tab !== "shared" && item.scope === "shared";
              return (
                <div key={`${item.scope}|${idx}`} className="rounded-xl border border-border/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={`${input} max-w-[220px] font-mono`} value={item.key} disabled={inherited} onChange={(e) => update((b) => { b.items[idx].key = e.target.value.trim(); })} />
                    <input className={`${input} max-w-xs`} placeholder="Label" value={item.label} disabled={inherited} onChange={(e) => update((b) => { b.items[idx].label = e.target.value; })} />
                    <select className={`${input} w-auto`} value={item.status} disabled={inherited} onChange={(e) => update((b) => { b.items[idx].status = e.target.value as ItemStatus; })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <StatusChip state={STATUS_CHIP[item.status]}>{STATUS_LABEL[item.status]}</StatusChip>
                    <StatusChip state="idle">{tag}</StatusChip>
                    <div className="ml-auto flex gap-1">
                      <button className={btn} onClick={() => move(idx, -1)} aria-label="Move up">↑</button>
                      <button className={btn} onClick={() => move(idx, 1)} aria-label="Move down">↓</button>
                      {inherited
                        ? <button className={btn} onClick={() => update((b) => { b.items.push({ ...item, scope: tab }); })}>Override for {PROPERTY_LABEL[tab]}</button>
                        : <button className={btn} onClick={() => confirm(`Delete ${item.key}?`) && update((b) => { b.items.splice(idx, 1); })}>Delete</button>}
                    </div>
                  </div>
                  <textarea className={`${input} mt-2 min-h-[60px]`} value={item.value} disabled={inherited} onChange={(e) => update((b) => { b.items[idx].value = e.target.value; })} />
                  {warnings.map((w, n) => (
                    <p key={n} className="mt-1 text-xs text-warning-foreground"><span className="rounded bg-warning/20 px-1">⚠ "{w.term}"</span> — use {w.rule.use} instead. {w.rule.why}</p>
                  ))}
                  {!inherited && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input className={`${input} flex-1`} placeholder="Notes (not published)" value={item.notes} onChange={(e) => update((b) => { b.items[idx].notes = e.target.value; })} />
                      <select className={`${input} w-auto`} value={item.related ?? ""} onChange={(e) => update((b) => { b.items[idx].related = (e.target.value || null) as MessagingItem["related"]; })}>
                        <option value="">No related assessment</option>
                        {RELATED_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AdminCard>
      )}

      {view === "preview" && <PreviewCard body={body} />}

      {view === "rules" && (
        <AdminCard title="Wording rules" description="Words to use and avoid. Editors see a warning (not a block) when a value uses an avoid word. Separate several avoid words with commas.">
          <div className="grid gap-2">
            {body.vocabulary.map((r, n) => (
              <div key={n} className="grid gap-2 rounded-lg border border-border/60 p-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input className={input} placeholder="Use" value={r.use} onChange={(e) => update((b) => { b.vocabulary[n].use = e.target.value; })} />
                <input className={input} placeholder="Avoid" value={r.avoid.join(", ")} onChange={(e) => update((b) => { b.vocabulary[n].avoid = e.target.value.split(",").map((s) => s.trim()).filter(Boolean); })} />
                <input className={input} placeholder="Why" value={r.why} onChange={(e) => update((b) => { b.vocabulary[n].why = e.target.value; })} />
                <button className={btn} onClick={() => update((b) => { b.vocabulary.splice(n, 1); })}>Remove</button>
              </div>
            ))}
            <div><button className={btn} onClick={() => update((b) => { b.vocabulary.push({ use: "", avoid: [], why: "" }); })}>Add rule</button></div>
          </div>
        </AdminCard>
      )}

      {view === "history" && (
        <AdminCard title="History" description="Every version of the messaging set. Making an older one live again publishes a copy as a new version.">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-1">Version</th><th>Status</th><th>Note</th><th>By</th><th>When</th><th /></tr></thead>
            <tbody>
              {data.versions.map((v) => (
                <tr key={v.id} className="border-t border-border/60">
                  <td className="py-1.5">v{v.version}</td>
                  <td><StatusChip state={v.status === "published" ? "ok" : v.status === "draft" ? "warn" : "idle"}>{v.status === "published" ? "Live" : v.status === "draft" ? "Draft" : "Archived"}</StatusChip></td>
                  <td className="text-muted-foreground">{v.note ?? ""}</td>
                  <td>{v.created_by ?? "—"}</td>
                  <td>{fmt(v.published_at ?? v.created_at)}</td>
                  <td className="text-right">
                    {v.status === "archived" ? <button className={btn} disabled={busy} onClick={() => confirm(`Make version ${v.version} live again? This replaces any draft.`) && run(`Version ${v.version} restored`, () => act({ data: { action: "rollback", version: v.version } }))}>Make this live again</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      )}

      {view === "hooks" && <HooksCard hooks={data.settings.publish_hooks} last={data.settings.last_hook_results}
        save={(hooks) => run("Publish hook saved", () => act({ data: { action: "hooks", hooks } }), true)} busy={busy} />}
    </div>
  );
}

function diffCount(a: MessagingBody, b: MessagingBody) {
  const key = (i: MessagingItem) => `${i.scope}|${i.key}`;
  const am = new Map(a.items.map((i) => [key(i), JSON.stringify(i)]));
  const bm = new Map(b.items.map((i) => [key(i), JSON.stringify(i)]));
  let n = 0;
  for (const [k, v] of bm) if (am.get(k) !== v) n++;
  for (const k of am.keys()) if (!bm.has(k)) n++;
  if (JSON.stringify(a.vocabulary) !== JSON.stringify(b.vocabulary)) n++;
  return n;
}

function PreviewCard({ body }: { body: MessagingBody }) {
  const [p, setP] = useState<Property>("globaledgemarkets.com");
  const all = effectiveSet(body, p);
  const payload = publicPayload(body, p, 0, null);
  const drafts = all.filter((i) => i.status === "draft");
  const needs = all.filter((i) => i.status === "needs_input");
  return (
    <AdminCard title="Preview" description="Exactly what this site's public link would show from the current editor contents (Approved items only).">
      <select className={`${input} w-auto`} value={p} onChange={(e) => setP(e.target.value as Property)}>
        {PROPERTIES.map((x) => <option key={x} value={x}>{PROPERTY_LABEL[x]}</option>)}
      </select>
      <p className="mt-3 text-xs text-muted-foreground">Public link: /api/public/messaging?property={p}</p>
      <ul className="mt-3 grid gap-2">
        {payload.items.map((i) => (
          <li key={i.key} className="rounded-lg bg-muted/60 p-2 text-sm"><span className="font-mono text-xs text-muted-foreground">{i.key}</span><p className="whitespace-pre-wrap text-foreground">{i.value}</p></li>
        ))}
      </ul>
      <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted-foreground">Hidden — draft ({drafts.length})</summary><ul className="mt-2 grid gap-1">{drafts.map((i) => <li key={i.key} className="font-mono text-xs">{i.key}</li>)}</ul></details>
      <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">Hidden — needs input ({needs.length})</summary><ul className="mt-2 grid gap-1">{needs.map((i) => <li key={i.key} className="font-mono text-xs">{i.key}</li>)}</ul></details>
    </AdminCard>
  );
}

function HooksCard({ hooks, last, save, busy }: { hooks: Hook[]; last: Overview["settings"]["last_hook_results"]; save: (h: Hook[]) => void; busy: boolean }) {
  const [list, setList] = useState<Hook[]>(hooks);
  return (
    <AdminCard title="Publish hook" description="Web addresses called after each publish (for example to clear the WordPress cache). They receive the version and which sites changed. A failure never undoes a publish.">
      <div className="grid gap-2">
        {list.map((h, n) => (
          <div key={n} className="flex flex-wrap items-center gap-2">
            <input className={`${input} max-w-[160px]`} placeholder="Name" value={h.label ?? ""} onChange={(e) => setList(list.map((x, i) => i === n ? { ...x, label: e.target.value } : x))} />
            <input className={`${input} flex-1`} placeholder="https://…" value={h.url} onChange={(e) => setList(list.map((x, i) => i === n ? { ...x, url: e.target.value } : x))} />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={h.enabled} onChange={(e) => setList(list.map((x, i) => i === n ? { ...x, enabled: e.target.checked } : x))} /> On</label>
            <button className={btn} onClick={() => setList(list.filter((_, i) => i !== n))}>Remove</button>
          </div>
        ))}
        <div className="flex gap-2">
          <button className={btn} onClick={() => setList([...list, { url: "", enabled: true, label: "" }])}>Add address</button>
          <button className={primary} disabled={busy} onClick={() => save(list.filter((h) => h.url))}>Save</button>
        </div>
      </div>
      {last ? <ResultList heading={`Last publish (${fmt(last.at)})`} ok={last.results.every((r) => r.ok)} items={last.results} /> : null}
    </AdminCard>
  );
}
