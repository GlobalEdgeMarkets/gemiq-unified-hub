// Report control: shared report settings, per-result access decisions, Hub-built
// report content (app-sent text first, AI fills gaps once), and admin actions.
// Server-only.
import { createHubServiceClient } from "./supabase-server";
import { REGISTRY_BY_KEY } from "./assessments";
import { normalizeTier } from "./assessments/tiers";
import manifest from "./manifest.json";
import {
  DEFAULT_REPORT_SETTINGS,
  mergeSettings,
  isReportLocked,
  trialSections,
  tierFor,
  reportTitle,
  type ReportOverride,
  type ReportSettings,
  type SectionKey,
} from "@/lib/report-settings";

const HUB = "https://gemiq.globaledgemarkets.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createHubServiceClient();
}

export type RoadmapItem = {
  horizon: "30" | "60" | "90";
  action: string;
  priority: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  owner: string;
};

export type ExecutiveSummary = { headline: string; so_what: string; findings: string[]; priorities: string[] };

export type ReportContent = {
  executive_summary?: ExecutiveSummary;
  dimension_insights?: Record<string, string>;
  risks?: string[];
  roadmap?: RoadmapItem[];
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  recommendations?: string[];
  next_steps?: string[];
  source?: Record<string, "app" | "ai">;
};

type SubRow = {
  id: string;
  user_id: string | null;
  email: string;
  assessment_key: string;
  score: number | null;
  tier: string | null;
  dimensions: unknown;
  metadata: Record<string, unknown> | null;
  submitted_at: string;
  report_unlocked_override: boolean | null;
  report_hidden: boolean;
  report_content: ReportContent | null;
  report_generated_at: string | null;
  admin_actions: { action: string; by: string; at: string }[];
};

const SUB_COLS =
  "id,user_id,email,assessment_key,score,tier,dimensions,metadata,submitted_at,report_unlocked_override,report_hidden,report_content,report_generated_at,admin_actions";

// ---------- settings ----------
export async function getAllSettings(): Promise<{ global: ReportSettings; overrides: Record<string, ReportOverride> }> {
  const { data, error } = await db().from("hub_report_settings").select("scope,settings");
  if (error) throw new Error(`Could not load report settings: ${error.message}`);
  const rows = (data ?? []) as { scope: string; settings: ReportOverride }[];
  const g = rows.find((r) => r.scope === "global")?.settings ?? {};
  const overrides = Object.fromEntries(rows.filter((r) => r.scope !== "global").map((r) => [r.scope, r.settings ?? {}]));
  return { global: mergeSettings(g), overrides };
}

export async function effectiveSettings(key: string): Promise<ReportSettings> {
  try {
    const all = await getAllSettings();
    return mergeSettings(all.global, all.overrides[key]);
  } catch {
    return DEFAULT_REPORT_SETTINGS;
  }
}

export async function saveSettings(scope: string, settings: ReportOverride | null, by: string) {
  if (scope !== "global" && settings === null) {
    const { error } = await db().from("hub_report_settings").delete().eq("scope", scope);
    if (error) throw new Error(error.message);
    return { ok: true };
  }
  const { error } = await db()
    .from("hub_report_settings")
    .upsert({ scope, settings: settings ?? {}, updated_by: by, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Could not save report settings: ${error.message}`);
  return { ok: true };
}

/** Public slice for /api/public/manifest. Never throws. */
export async function getPublicReport(appKeys: string[]): Promise<{ global: ReportSettings; apps: Record<string, ReportSettings> } | null> {
  try {
    const all = await getAllSettings();
    return {
      global: all.global,
      apps: Object.fromEntries(appKeys.map((k) => [k, mergeSettings(all.global, all.overrides[k])])),
    };
  } catch (e) {
    console.error("[report-control] public report settings unavailable", e);
    return null;
  }
}

// ---------- helpers ----------
async function planActiveFor(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!userIds.length) return out;
  const { data } = await db()
    .from("subscriptions")
    .select("user_id,status,updated_at")
    .in("user_id", userIds)
    .order("updated_at", { ascending: false });
  for (const r of (data ?? []) as { user_id: string; status: string | null }[]) {
    if (!out.has(r.user_id)) out.set(r.user_id, r.status ?? "none");
  }
  return out;
}

function displayName(key: string) {
  return REGISTRY_BY_KEY[key]?.displayName ?? key;
}

function prettify(k: string) {
  return k.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dims(raw: unknown): { key: string; label: string; score: number }[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: { key: string; label: string; score: number }[] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n)) continue;
    const pct = n <= 10 ? Math.round((n / 9) * 100) : Math.round(n);
    out.push({ key: k, label: prettify(k), score: Math.max(0, Math.min(100, pct)) });
  }
  return out.sort((a, b) => b.score - a.score);
}

function appSentContent(meta: Record<string, unknown> | null): ReportContent {
  const r = meta?.recommendations;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : undefined);
  if (Array.isArray(r)) return { recommendations: strs(r) };
  if (r && typeof r === "object") {
    const o = r as Record<string, unknown>;
    return {
      summary: typeof o.summary === "string" ? o.summary : undefined,
      strengths: strs(o.strengths),
      gaps: strs(o.gaps),
      recommendations: strs(o.recommendations),
      next_steps: strs(o.next_steps),
    };
  }
  return {};
}

// ---------- AI ----------
type AiContext = {
  benchmark: Benchmark | null;
  tierRecommendations: string[];
  methodology: string | null;
  roadmapItems: number;
};

const LVL = ["low", "medium", "high"] as const;
const pickLvl = (v: unknown, d: (typeof LVL)[number]) => (LVL.includes(v as never) ? (v as (typeof LVL)[number]) : d);
const strArr = (v: unknown, max = 6) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, max) : undefined;

function cleanAi(parsed: Record<string, unknown>, missing: string[]): Partial<ReportContent> {
  const out: Partial<ReportContent> = {};
  for (const k of missing) {
    const v = parsed[k];
    if (k === "summary" && typeof v === "string") out.summary = v;
    else if (k === "executive_summary" && v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      out.executive_summary = {
        headline: typeof o.headline === "string" ? o.headline : "",
        so_what: typeof o.so_what === "string" ? o.so_what : "",
        findings: strArr(o.findings, 3) ?? [],
        priorities: strArr(o.priorities, 3) ?? [],
      };
    } else if (k === "dimension_insights" && v && typeof v === "object" && !Array.isArray(v)) {
      out.dimension_insights = Object.fromEntries(
        Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x === "string") as [string, string][],
      );
    } else if (k === "roadmap" && Array.isArray(v)) {
      out.roadmap = v
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof (x as { action?: unknown }).action === "string")
        .slice(0, 12)
        .map((x) => ({
          horizon: (["30", "60", "90"].includes(String(x.horizon)) ? String(x.horizon) : "30") as RoadmapItem["horizon"],
          action: String(x.action),
          priority: pickLvl(x.priority, "medium") as RoadmapItem["priority"],
          effort: pickLvl(x.effort, "medium"),
          impact: pickLvl(x.impact, "medium"),
          owner: typeof x.owner === "string" ? x.owner : "Leadership",
        }));
    } else {
      const a = strArr(v);
      if (a) (out as Record<string, unknown>)[k] = a;
    }
  }
  return out;
}

async function aiWrite(row: SubRow, missing: string[], ctx: AiContext): Promise<Partial<ReportContent>> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured for this project.");
  const d = dims(row.dimensions);
  const input = JSON.stringify({
    assessment: displayName(row.assessment_key),
    score: row.score,
    tier: normalizeTier(row.tier) ?? row.tier,
    dimensions: d.map((x) => ({ key: x.key, name: x.label, score: x.score })),
    company: row.metadata?.company ?? null,
    benchmark: ctx.benchmark
      ? { peer_median: ctx.benchmark.median, top_quartile: ctx.benchmark.top, basis: ctx.benchmark.label }
      : null,
    tier_guidance: ctx.tierRecommendations,
    methodology: ctx.methodology,
    roadmap_items: ctx.roadmapItems,
    write: missing,
  });
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_object" } },
      instructions:
        "You are a senior strategy consultant writing sections of a GEM.IQ maturity assessment report for a business leader, " +
        "in the style of a top-tier consulting firm: insight first, specific, prioritised, no filler. " +
        "Use only the scores, benchmark, tier guidance and methodology given; never invent facts, statistics, clients or numbers. " +
        "Return a JSON object containing only the keys listed in `write`:\n" +
        "executive_summary: { headline (one sentence, the single most important conclusion), so_what (one sentence on business consequence), " +
        "findings (3 bullets), priorities (3 bullets) };\n" +
        "summary (2-3 sentences); strengths (3 bullets from the highest dimensions); gaps (3 bullets from the lowest dimensions); " +
        "risks (3 bullets: what happens if the gaps are not addressed);\n" +
        "dimension_insights: object keyed by each dimension `key`, value one sentence interpreting that score;\n" +
        "recommendations (4 concrete actions tied to the gaps); next_steps (3 actions for the next 30 days);\n" +
        "roadmap: array of exactly `roadmap_items` objects { horizon: \"30\"|\"60\"|\"90\", action, priority: low|medium|high, " +
        "effort: low|medium|high, impact: low|medium|high, owner (a role such as CEO, Head of Sales) }, spread across all three horizons. " +
        "All strings at most 30 words.",
      input: `Assessment data (json):\n${input}`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[report-control] AI failed [${res.status}]: ${body}`);
    if (res.status === 402) throw new Error("AI credits have run out. Add credits to the workspace and try again.");
    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a minute.");
    throw new Error(`Writing the report failed [${res.status}].`);
  }
  const json = (await res.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
  const text = (json.output ?? [])
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("");
  try {
    return cleanAi(JSON.parse(text) as Record<string, unknown>, missing);
  } catch {
    throw new Error("The AI returned an unreadable report. Try Regenerate.");
  }
}

/** Content keys each section needs. */
const SECTION_CONTENT: Partial<Record<SectionKey, (keyof ReportContent)[]>> = {
  executive_summary: ["executive_summary"],
  summary: ["summary"],
  dimensions: ["dimension_insights"],
  strengths: ["strengths"],
  gaps: ["gaps", "risks"],
  recommendations: ["recommendations"],
  roadmap: ["roadmap"],
  next_steps: ["next_steps"],
};

function hasValue(v: unknown) {
  if (v == null) return false;
  if (typeof v === "string") return !!v.trim();
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

async function aiContext(row: SubRow, settings: ReportSettings, benchmark: Benchmark | null): Promise<AiContext> {
  let tierRecommendations: string[] = [];
  let methodology: string | null = null;
  try {
    const { publishedFor } = await import("./content.server");
    const pub = (await publishedFor(row.assessment_key)) as { body?: { tier_recommendations?: Record<string, string[]>; methodology?: { summary?: string } } } | null;
    const t = normalizeTier(row.tier) ?? tierFor(row.score, settings.tiers)?.key ?? "";
    tierRecommendations = pub?.body?.tier_recommendations?.[t] ?? [];
    methodology = pub?.body?.methodology?.summary ?? null;
  } catch { /* content optional */ }
  return { benchmark, tierRecommendations, methodology, roadmapItems: settings.roadmap_items };
}

/**
 * Builds and stores content once. App-sent text always wins; AI fills enabled sections
 * that have no text yet. Existing text is never rewritten unless `force` (admin Regenerate).
 */
async function ensureContent(row: SubRow, settings: ReportSettings, benchmark: Benchmark | null, force = false): Promise<ReportContent> {
  const stored: ReportContent = force ? {} : { ...(row.report_content ?? {}) };
  const content: ReportContent = { ...stored, source: { ...(stored.source ?? {}) } };
  const app = appSentContent(row.metadata);
  for (const [k, v] of Object.entries(app)) {
    if (hasValue(v) && !hasValue((content as Record<string, unknown>)[k])) {
      (content as Record<string, unknown>)[k] = v;
      content.source![k] = "app";
    }
  }
  const enabled = settings.sections.filter((s) => s.enabled).map((s) => s.key);
  const missing = [...new Set(enabled.flatMap((k) => SECTION_CONTENT[k] ?? []))].filter(
    (k) => !hasValue((content as Record<string, unknown>)[k]),
  );
  if (!missing.length && row.report_content && !force) return row.report_content;
  if (missing.length && row.score != null) {
    const ai = await aiWrite(row, missing, await aiContext(row, settings, benchmark));
    for (const [k, v] of Object.entries(ai)) {
      (content as Record<string, unknown>)[k] = v;
      content.source![k] = "ai";
    }
  }
  await db()
    .from("submissions")
    .update({ report_content: content, report_generated_at: new Date().toISOString() })
    .eq("id", row.id);
  return content;
}

// ---------- benchmarks ----------
export type Benchmark = {
  source: "industry" | "all" | "reference";
  label: string;
  n: number;
  median: number;
  top: number;
  /** Share of peers scoring below this result (real data only). */
  percentile: number | null;
  dimensions: Record<string, number>;
};

const quant = (xs: number[], q: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (i - lo));
};

export async function computeBenchmark(
  assessmentKey: string,
  industry: string | null,
  score: number | null,
  settings: ReportSettings,
): Promise<Benchmark> {
  type R = { email: string; user_id: string | null; score: number | null; dimensions: unknown; submitted_at: string };
  const { data } = await db()
    .from("submissions")
    .select("email,user_id,score,dimensions,submitted_at")
    .eq("assessment_key", assessmentKey)
    .not("score", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(5000);
  const latest = new Map<string, R>();
  for (const r of (data ?? []) as R[]) {
    const e = r.email.toLowerCase();
    if (/\+(gemtest|checkly)-/.test(e)) continue;
    if (!latest.has(e)) latest.set(e, r);
  }
  const rows = [...latest.values()];
  const ids = [...new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))];
  const ind = new Map<string, string | null>();
  if (industry && ids.length) {
    const { data: profs } = await db().from("profiles").select("id,industry").in("id", ids);
    for (const p of (profs ?? []) as { id: string; industry: string | null }[]) ind.set(p.id, p.industry);
  }
  const build = (src: Benchmark["source"], label: string, group: R[]): Benchmark => {
    const scores = group.map((r) => Number(r.score)).filter(Number.isFinite);
    const dimVals: Record<string, number[]> = {};
    for (const r of group) for (const d of dims(r.dimensions)) (dimVals[d.key] ??= []).push(d.score);
    return {
      source: src,
      label,
      n: scores.length,
      median: quant(scores, 0.5),
      top: quant(scores, 0.75),
      percentile: score == null ? null : Math.round((scores.filter((x) => x < score).length / scores.length) * 100),
      dimensions: Object.fromEntries(Object.entries(dimVals).map(([k, v]) => [k, quant(v, 0.5)])),
    };
  };
  const min = settings.benchmark.min_group;
  if (industry) {
    const group = rows.filter((r) => r.user_id && (ind.get(r.user_id) ?? "").toLowerCase() === industry.toLowerCase());
    if (group.length >= min) return build("industry", `${industry} companies`, group);
  }
  if (rows.length >= min) return build("all", "All companies assessed", rows);
  const ref = settings.benchmark.reference[assessmentKey] ?? settings.benchmark.reference.default ?? { median: 52, top: 68 };
  return { source: "reference", label: "GEM reference values", n: rows.length, median: ref.median, top: ref.top, percentile: null, dimensions: {} };
}

// ---------- report view ----------
export type ReportView = {
  id: string;
  title: string;
  assessment_key: string;
  assessment_name: string;
  assessment_url: string;
  email: string;
  submitted_at: string;
  score: number | null;
  tier: { label: string; color: string } | null;
  locked: boolean;
  hidden: boolean;
  is_admin_view: boolean;
  sections: { key: SectionKey; locked: boolean }[];
  dimensions: { key: string; label: string; score: number }[];
  content: ReportContent;
  copy: ReportSettings["copy"];
  unlock_url: string;
  company: string | null;
  industry: string | null;
  report_ref: string;
  tiers: { key: string; label: string; min: number; color: string }[];
  tier_key: string | null;
  benchmark: Benchmark | null;
  methodology: {
    scoring: string;
    maturity_model: string;
    how_to_read: string;
    summary: string | null;
    frameworks: string[];
    rationale: { title: string; text: string }[];
  };
};

async function industryFor(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await db().from("profiles").select("industry").eq("id", userId).maybeSingle();
  return (data as { industry: string | null } | null)?.industry ?? null;
}

async function methodologyFor(key: string): Promise<ReportView["methodology"]> {
  const { DEFAULT_METHODOLOGY } = await import("@/lib/composite");
  let general = DEFAULT_METHODOLOGY;
  try {
    const { getCompositeConfig } = await import("./composite.server");
    general = (await getCompositeConfig()).methodology;
  } catch { /* defaults */ }
  let summary: string | null = null;
  let frameworks: string[] = [];
  let rationale: { title: string; text: string }[] = [];
  try {
    const { publishedFor } = await import("./content.server");
    const pub = (await publishedFor(key)) as {
      body?: { methodology?: { summary?: string; frameworks?: string[] }; sections?: { title: string; rationale?: string }[] };
    } | null;
    summary = pub?.body?.methodology?.summary ?? null;
    frameworks = pub?.body?.methodology?.frameworks ?? [];
    rationale = (pub?.body?.sections ?? []).filter((x) => x.rationale).map((x) => ({ title: x.title, text: x.rationale! }));
  } catch { /* content optional */ }
  return { scoring: general.scoring, maturity_model: general.maturity_model, how_to_read: general.how_to_read, summary, frameworks, rationale };
}

export async function loadReport(
  id: string,
  viewer: { userId: string; email: string | null; isAdmin: boolean },
): Promise<ReportView | null> {
  const { data, error } = await db().from("submissions").select(SUB_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load this report.");
  const row = data as SubRow | null;
  if (!row) return null;
  const owner = row.user_id === viewer.userId || (!!viewer.email && row.email.toLowerCase() === viewer.email.toLowerCase());
  if (!owner && !viewer.isAdmin) return null;
  if (row.report_hidden && !viewer.isAdmin) return null;

  const settings = await effectiveSettings(row.assessment_key);
  const plan = row.user_id ? (await planActiveFor([row.user_id])).get(row.user_id) : undefined;
  const locked = isReportLocked(row, plan === "active");
  const allowed = new Set(trialSections(settings.trial_access));
  const sections = settings.sections
    .filter((s) => s.enabled)
    .map((s) => ({ key: s.key, locked: locked && !allowed.has(s.key) && s.key !== "talk_to_gem" }));

  const industry = await industryFor(row.user_id).catch(() => null);
  const enabledKeys = new Set(settings.sections.filter((s) => s.enabled).map((s) => s.key));
  const benchmark = await computeBenchmark(row.assessment_key, industry, row.score, settings).catch((e) => {
    console.error("[report-control] benchmark failed", e);
    return null;
  });
  const methodology = await methodologyFor(row.assessment_key);

  // Locked viewers never see (or trigger generation of) the full text.
  const content = locked && !viewer.isAdmin ? {} : await ensureContent(row, settings, benchmark).catch((e) => {
    console.error("[report-control] content failed", e);
    return row.report_content ?? {};
  });

  const t = tierFor(row.score, settings.tiers);
  const norm = normalizeTier(row.tier);
  const named = norm ? settings.tiers.find((x) => x.key === norm) : null;
  const tier = named ?? t;
  const meta = row.metadata ?? {};
  const name = [meta.first_name, meta.last_name].filter((x) => typeof x === "string").join(" ") || null;

  return {
    id: row.id,
    title: reportTitle(settings.copy.title_pattern, {
      assessment: displayName(row.assessment_key),
      company: typeof meta.company === "string" ? meta.company : null,
      name,
    }),
    assessment_key: row.assessment_key,
    assessment_name: displayName(row.assessment_key),
    assessment_url: manifest.assessments.find((a) => a.key === row.assessment_key)?.url ?? HUB,
    email: row.email,
    submitted_at: row.submitted_at,
    score: row.score == null ? null : Math.round(row.score),
    tier: tier ? { label: tier.label, color: tier.color } : null,
    locked,
    hidden: row.report_hidden,
    is_admin_view: viewer.isAdmin && !owner,
    sections,
    dimensions: settings.trial_access === "score" && locked ? [] : dims(row.dimensions),
    content: locked && !viewer.isAdmin ? {} : content,
    copy: settings.copy,
    unlock_url: `${HUB}/auth?mode=signup&plan=complete`,
    company: typeof meta.company === "string" ? meta.company : null,
    industry,
    report_ref: `GEM-${row.assessment_key.toUpperCase()}-${row.id.slice(0, 8).toUpperCase()}`,
    tiers: settings.tiers,
    tier_key: tier ? tier.key : null,
    benchmark: enabledKeys.has("benchmark") || enabledKeys.has("dimensions") ? (locked && !viewer.isAdmin ? benchmarkTeaser(benchmark) : benchmark) : null,
    methodology,
  };
}

function benchmarkTeaser(b: Benchmark | null): Benchmark | null {
  return b ? { ...b, dimensions: {} } : null;
}

// ---------- combined report ----------
export type CombinedReportView = {
  company: string | null;
  email: string;
  generated_at: string;
  score: number | null;
  tier_label: string | null;
  tier_key: string | null;
  tiers: { key: string; label: string; min: number; color: string }[];
  needed_for_tier: number;
  coverage: { completed: number; total: number };
  locked: boolean;
  contributions: { assessment_key: string; display_name: string; score: number | null; tier: string | null; report_id: string | null }[];
  missing: { assessment_key: string; display_name: string; url: string }[];
  next: { assessment_key: string; display_name: string; url: string } | null;
  strengths: { label: string; score: number; sources: string[] }[];
  gaps: { label: string; score: number; sources: string[] }[];
  insights: string[];
  roadmap: (RoadmapItem & { assessment: string })[];
  methodology: { overview: string; scoring: string; maturity_model: string; how_to_read: string };
  unlock_url: string;
};

/** Combined GEM.IQ report for the signed-in user, built from the dashboard composite. */
export async function loadCombinedReport(): Promise<CombinedReportView | null> {
  const { loadDashboard } = await import("@/lib/dashboard.server");
  const dash = await loadDashboard();
  if (!dash) return null;
  const { getCompositeConfig } = await import("./composite.server");
  const { DEFAULT_COMPOSITE, DEFAULT_METHODOLOGY } = await import("@/lib/composite");
  const cfg = await getCompositeConfig().catch(() => ({ settings: DEFAULT_COMPOSITE, methodology: DEFAULT_METHODOLOGY }));
  const c = dash.composite;
  const sub = dash.subscription;
  const locked = !(sub && (sub.status === "active" || sub.status === "trialing") && !sub.trialing);

  // Latest stored content per assessment for the roadmap roll-up.
  const { data } = await db()
    .from("submissions")
    .select("id,assessment_key,report_content,submitted_at")
    .ilike("email", dash.user.email)
    .eq("report_hidden", false)
    .order("submitted_at", { ascending: false });
  const latest = new Map<string, { id: string; report_content: ReportContent | null }>();
  for (const r of (data ?? []) as { id: string; assessment_key: string; report_content: ReportContent | null }[]) {
    if (!latest.has(r.assessment_key)) latest.set(r.assessment_key, r);
  }
  const rank = { high: 0, medium: 1, low: 2 } as const;
  const roadmap = [...latest.entries()]
    .flatMap(([k, r]) => (r.report_content?.roadmap ?? []).map((x) => ({ ...x, assessment: displayName(k) })))
    .sort((a, b) => Number(a.horizon) - Number(b.horizon) || rank[a.priority] - rank[b.priority] || rank[b.impact] - rank[a.impact])
    .slice(0, 12);

  // Rule-based cross-assessment insights (no invented facts).
  const scored = c.contributions.filter((x) => x.score != null) as { display_name: string; score: number }[];
  const insights: string[] = [];
  if (scored.length >= 2) {
    const hi = scored[0];
    const lo = scored[scored.length - 1];
    if (hi.score - lo.score >= 15)
      insights.push(`${hi.display_name} (${hi.score}) is well ahead of ${lo.display_name} (${lo.score}). Imbalances like this usually cap growth at the weakest discipline, so ${lo.display_name} is where effort pays back fastest.`);
    else insights.push(`Your disciplines are evenly matched (${lo.score}–${hi.score}). Progress now comes from lifting all of them together rather than fixing one outlier.`);
  }
  if (c.gaps[0]) insights.push(`Your weakest area across assessments is ${c.gaps[0].label} (${c.gaps[0].score}), seen in ${c.gaps[0].sources.join(", ")}.`);
  if (c.strengths[0]) insights.push(`Your strongest area is ${c.strengths[0].label} (${c.strengths[0].score}), a foundation to build the roadmap on.`);
  if (c.next) insights.push(`Completing ${c.next.display_name} next adds the most weight to your combined picture.`);

  return {
    company: dash.user.company,
    email: dash.user.email,
    generated_at: new Date().toISOString(),
    score: c.score,
    tier_label: c.tier_label,
    tier_key: c.tier,
    tiers: cfg.settings.tiers.map((t: { key: string; label: string; min: number; color?: string }, i: number) => ({
      key: t.key, label: t.label, min: t.min, color: t.color ?? DEFAULT_REPORT_SETTINGS.tiers[i]?.color ?? "#2C365B",
    })),
    needed_for_tier: c.needed_for_tier,
    coverage: c.coverage,
    locked,
    contributions: c.contributions.map((x) => ({ ...x, report_id: latest.get(x.assessment_key)?.id ?? null })),
    missing: c.missing,
    next: c.next,
    strengths: c.strengths.slice(0, 3),
    gaps: c.gaps.slice(0, 3),
    insights: locked ? insights.slice(0, 1) : insights,
    roadmap: locked ? [] : roadmap,
    methodology: cfg.methodology,
    unlock_url: `${HUB}/auth?mode=signup&plan=complete`,
  };
}

// ---------- admin list + stats ----------
export type ReportListFilter = {
  assessment_key?: string;
  email?: string;
  from?: string;
  to?: string;
  tier?: string;
  lock?: "locked" | "unlocked" | "all";
  include_hidden?: boolean;
  limit?: number;
};

export async function listReports(f: ReportListFilter) {
  let q = db().from("submissions").select(SUB_COLS).order("submitted_at", { ascending: false }).limit(Math.min(f.limit ?? 200, 1000));
  if (f.assessment_key) q = q.eq("assessment_key", f.assessment_key);
  if (f.email) q = q.ilike("email", `%${f.email.replace(/[%_]/g, "")}%`);
  if (f.from) q = q.gte("submitted_at", `${f.from}T00:00:00Z`);
  if (f.to) q = q.lte("submitted_at", `${f.to}T23:59:59Z`);
  if (!f.include_hidden) q = q.eq("report_hidden", false);
  const { data, error } = await q;
  if (error) throw new Error(`Could not load results: ${error.message}`);
  const rows = (data ?? []) as SubRow[];
  const plans = await planActiveFor([...new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))]);
  const all = await getAllSettings().catch(() => ({ global: DEFAULT_REPORT_SETTINGS, overrides: {} as Record<string, ReportOverride> }));

  let items = rows.map((r) => {
    const plan = r.user_id ? plans.get(r.user_id) ?? "none" : "none";
    const s = mergeSettings(all.global, all.overrides[r.assessment_key]);
    const tier = normalizeTier(r.tier) ?? tierFor(r.score, s.tiers)?.key ?? null;
    return {
      id: r.id,
      email: r.email,
      assessment_key: r.assessment_key,
      assessment_name: displayName(r.assessment_key),
      score: r.score == null ? null : Math.round(r.score),
      tier,
      submitted_at: r.submitted_at,
      entitlement: (r.metadata?.entitlement as string | undefined) ?? null,
      plan,
      locked: isReportLocked(r, plan === "active"),
      override: r.report_unlocked_override,
      hidden: r.report_hidden,
      generated: !!r.report_generated_at,
      last_action: r.admin_actions?.[r.admin_actions.length - 1] ?? null,
    };
  });
  if (f.tier) items = items.filter((i) => i.tier === f.tier);
  if (f.lock === "locked") items = items.filter((i) => i.locked);
  if (f.lock === "unlocked") items = items.filter((i) => !i.locked);

  // Stats over the returned window.
  const weekAgo = Date.now() - 7 * 86_400_000;
  const byIq: Record<string, { n: number; sum: number }> = {};
  const tiers: Record<string, number> = {};
  for (const i of items) {
    const b = (byIq[i.assessment_name] ??= { n: 0, sum: 0 });
    if (i.score != null) { b.n++; b.sum += i.score; }
    if (i.tier) tiers[i.tier] = (tiers[i.tier] ?? 0) + 1;
  }
  const trials = items.filter((i) => i.entitlement === "trial");
  const stats = {
    total: items.length,
    this_week: items.filter((i) => Date.parse(i.submitted_at) >= weekAgo).length,
    avg_by_iq: Object.fromEntries(Object.entries(byIq).map(([k, v]) => [k, v.n ? Math.round(v.sum / v.n) : null])),
    tiers,
    trial_reports: trials.length,
    trial_converted: trials.filter((i) => i.plan === "active").length,
  };
  return { items, stats };
}

// ---------- admin actions ----------
export type ReportAction = "unlock" | "relock" | "clear_override" | "hide" | "unhide" | "regenerate" | "resend";

export async function reportAction(id: string, action: ReportAction, by: string) {
  const { data, error } = await db().from("submissions").select(SUB_COLS).eq("id", id).maybeSingle();
  if (error || !data) throw new Error("Result not found.");
  const row = data as SubRow;
  const log = [...(row.admin_actions ?? []), { action, by, at: new Date().toISOString() }].slice(-50);
  const patch: Record<string, unknown> = { admin_actions: log };
  if (action === "unlock") patch.report_unlocked_override = true;
  if (action === "relock") patch.report_unlocked_override = false;
  if (action === "clear_override") patch.report_unlocked_override = null;
  if (action === "hide") patch.report_hidden = true;
  if (action === "unhide") patch.report_hidden = false;

  if (action === "regenerate") {
    const settings = await effectiveSettings(row.assessment_key);
    const industry = await industryFor(row.user_id);
    const bench = await computeBenchmark(row.assessment_key, industry, row.score, settings).catch(() => null);
    await ensureContent(row, settings, bench, true);
  }
  if (action === "resend") {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const r = await sendTemplateEmail("report-ready", row.email, {
      templateData: {
        assessmentName: displayName(row.assessment_key),
        reportUrl: `${HUB}/report/${row.id}`,
        firstName: typeof row.metadata?.first_name === "string" ? row.metadata.first_name : undefined,
      },
      idempotencyKey: `report-resend-${row.id}-${log.length}`,
    });
    if (!r.sent) throw new Error("This address has unsubscribed or bounced before, so the email was not sent.");
  }
  const { error: upErr } = await db().from("submissions").update(patch).eq("id", id);
  if (upErr) throw new Error(`Could not save: ${upErr.message}`);
  return { ok: true };
}

export function reportUrlFor(id: string) {
  return `${HUB}/report/${id}`;
}
