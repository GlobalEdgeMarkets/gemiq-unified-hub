// ReadinessIQ → four-IQ migration: read-only calibration + the migration itself.
// Server-only.
//
// The Hub does NOT hold ReadinessIQ credentials. It reads legacy assessments
// through ReadinessIQ's own `gemiq-read` endpoint, authenticated with a shared
// secret, so the service role key and PII boundary stay inside that project.
//
//   POST  $READINESS_READ_URL
//   headers: { "x-api-key": $GEMIQ_API_KEY, "content-type": "application/json" }
//   body:    { "action": "list", "limit": number } | { "action": "byEmail", "email": string }
//   200:     { "rows": Array<assessment row> }   (also accepts a bare array, or
//                                                 { data | assessments | results: [...] })
import { tierFromScore } from "@/lib/hub/assessments/tiers";
import type { SubmissionPayload } from "@/lib/hub/schemas";
import type { ImportRowResult, ImportHubspotResult } from "@/lib/hub/admin/legacy-submissions.server";

const STORED_TOTAL_KEYS = ["total", "composite", "overall", "score", "score100", "score_100"];

export type LegacyRow = Record<string, unknown>;


function str(row: LegacyRow, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
function obj(row: LegacyRow, ...keys: string[]): Record<string, unknown> | null {
  for (const k of keys) {
    const v = row[k];
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  }
  return null;
}

/** Dimension scores on the legacy 0–9 scale, minus any stored-total sibling. */
function dimensionScores(scores: Record<string, unknown> | null) {
  const dims: Record<string, number> = {};
  let storedTotal: { key: string; value: number } | null = null;
  const nonNumeric: string[] = [];
  for (const [k, v] of Object.entries(scores ?? {})) {
    const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    if (!Number.isFinite(n)) { nonNumeric.push(k); continue; }
    if (STORED_TOTAL_KEYS.includes(k.toLowerCase())) { storedTotal = { key: k, value: n }; continue; }
    dims[k] = n;
  }
  return { dims, storedTotal, nonNumeric };
}

/** mean(0–9 dimension values) / 9 × 100 — the inferred relationship calibration verifies. */
export function deriveScore(dims: Record<string, number>): number | null {
  const vals = Object.values(dims);
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round((mean / 9) * 100);
}

export const PRODUCT_TYPE_TO_KEY: Record<string, string> = {
  market: "gtmiq",
  enterprise: "salesiq",
  productization: "productiq",
  ai: "aitransformiq",
};
export function keyForProductType(productType: string | null): string {
  return PRODUCT_TYPE_TO_KEY[(productType ?? "").toLowerCase()] ?? "readinessiq";
}

async function readLegacyRows(input: { limit: number; email?: string }): Promise<LegacyRow[]> {
  const url = process.env.READINESS_READ_URL;
  const key = process.env.GEMIQ_API_KEY;
  if (!url || !key) {
    throw new Error(
      "READINESS_READ_URL and GEMIQ_API_KEY must be configured in the Hub environment. " +
      "The Hub reads legacy assessments through ReadinessIQ's gemiq-read endpoint, not with its credentials.",
    );
  }
  const email = input.email?.trim().toLowerCase();
  // gemiq-read contract: body { action: "stats" | "list" | "byEmail" }.
  // The Supabase gateway requires the ReadinessIQ publishable anon key in
  // `apikey`; the function itself authenticates on the shared key.
  const payload = email
    ? { action: "byEmail", email }
    : { action: "list", limit: input.limit };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: process.env.READINESS_ANON_KEY || READINESS_ANON_KEY_DEFAULT,
      "x-gemiq-key": key,
      "x-api-key": key,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`gemiq-read failed [${res.status}]: ${text.slice(0, 500)}`);
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new Error(`gemiq-read returned non-JSON: ${text.slice(0, 200)}`); }
  const b = body as { rows?: unknown; data?: unknown; assessments?: unknown; results?: unknown };
  const rows = Array.isArray(body) ? body : (b.rows ?? b.data ?? b.assessments ?? b.results);
  if (!Array.isArray(rows)) throw new Error(`gemiq-read response has no rows array: ${text.slice(0, 200)}`);
  return rows as LegacyRow[];
}


// ---------------------------------------------------------------- calibration

export type CalibrationRow = {
  legacy_id: string | null;
  email: string | null;
  product_type: string | null;
  created_at: string | null;
  dimension_count: number;
  min: number | null;
  max: number | null;
  mean_0_9: number | null;
  derived_score_100: number | null;
  derived_tier: string | null;
  stored_total_key: string | null;
  stored_total: number | null;
  disagreement: number | null;
  legacy_tier_label: string | null;
  report_url: string | null;
  non_numeric_keys: string[];
  raw_scores: Record<string, string | number | boolean | null> | null;
};

export async function runCalibrateReadinessScores(input: { limit?: number; email?: string }) {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const rows = await readLegacyRows({ limit, email: input.email });

  const out: CalibrationRow[] = rows.map(r => {
    const scores = obj(r, "scores");
    const { dims, storedTotal, nonNumeric } = dimensionScores(scores);
    const vals = Object.values(dims);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    const derived = deriveScore(dims);
    // A total may also live in answers rather than scores.
    const answers = obj(r, "answers");
    let sTotal = storedTotal;
    if (!sTotal && answers) {
      for (const k of STORED_TOTAL_KEYS) {
        const v = answers[k];
        const n = typeof v === "number" ? v : NaN;
        if (Number.isFinite(n)) { sTotal = { key: `answers.${k}`, value: n }; break; }
      }
    }
    return {
      legacy_id: str(r, "id"),
      email: str(r, "email"),
      product_type: str(r, "product_type"),
      created_at: str(r, "created_at", "submitted_at"),
      dimension_count: vals.length,
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
      mean_0_9: mean == null ? null : Math.round(mean * 100) / 100,
      derived_score_100: derived,
      derived_tier: tierFromScore(derived),
      stored_total_key: sTotal?.key ?? null,
      stored_total: sTotal?.value ?? null,
      disagreement: sTotal && derived != null ? Math.round((sTotal.value - derived) * 100) / 100 : null,
      legacy_tier_label: str(r, "tier", "tier_label", "maturity_tier", "level"),
      report_url: str(r, "report_url", "pdf_url", "result_url"),
      non_numeric_keys: nonNumeric,
      raw_scores: (scores as Record<string, string | number | boolean | null> | null),
    };
  });

  const byProduct: Record<string, number> = {};
  const tierBands: Record<string, number> = { reactive: 0, developing: 0, defined: 0, advanced: 0, optimized: 0 };
  const problems: CalibrationRow[] = [];
  for (const r of out) {
    const p = r.product_type ?? "(null)";
    byProduct[p] = (byProduct[p] ?? 0) + 1;
    if (r.derived_tier) tierBands[r.derived_tier] = (tierBands[r.derived_tier] ?? 0) + 1;
    if (!r.dimension_count || r.non_numeric_keys.length || !r.email) problems.push(r);
  }

  return {
    read: rows.length,
    limit,
    by_product_type: byProduct,
    tier_distribution: tierBands,
    stored_total_found: out.filter(r => r.stored_total != null).length,
    disagreements: out.filter(r => r.disagreement != null && Math.abs(r.disagreement) > 1).length,
    problem_rows: problems.length,
    formula: "round(mean(scores 0-9) / 9 * 100); stored total, when present, wins",
    rows: out,
  };
}

// ----------------------------------------------------------------- migration

type Transformed = { payload: SubmissionPayload; email: string; key: string };
type Skipped = { legacy_id: string | null; email: string | null; reason: string };

function transformRow(r: LegacyRow): Transformed | Skipped {
  const legacy_id = str(r, "id");
  const rawEmail = str(r, "email");
  const email = rawEmail ? rawEmail.trim().toLowerCase() : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { legacy_id, email: rawEmail, reason: "invalid_email" };
  }
  const scores = obj(r, "scores");
  const { dims, storedTotal } = dimensionScores(scores);
  if (!Object.keys(dims).length) return { legacy_id, email, reason: "no_numeric_scores" };

  const score = storedTotal?.value ?? deriveScore(dims);
  const productType = str(r, "product_type");
  const key = keyForProductType(productType);

  const answersRaw = obj(r, "answers");
  const answers: Record<string, unknown> = {};
  let answerLabels: unknown = null;
  for (const [k, v] of Object.entries(answersRaw ?? {})) {
    if (k === "__labels") { answerLabels = v; continue; }
    answers[k] = v;
  }

  const created_at = str(r, "created_at", "submitted_at");
  const submitted_at = created_at ? new Date(created_at).toISOString() : undefined;
  const report_url = str(r, "report_url", "pdf_url", "result_url");

  const payload: SubmissionPayload = {
    email,
    assessment_key: key,
    score,
    tier: tierFromScore(score),
    dimensions: dims,
    answers: Object.keys(answers).length ? answers : undefined,
    ...(report_url && /^https?:\/\//.test(report_url) ? { report_url } : {}),
    submitted_at,
    metadata: {
      first_name: str(r, "first_name", "firstname"),
      last_name: str(r, "last_name", "lastname"),
      company: str(r, "company", "company_name", "organization"),
      migrated_from: "readinessiq",
    },
    detail: {
      legacy_id,
      legacy_product_type: productType,
      legacy_product_name: str(r, "product_name"),
      legacy_tier_label: str(r, "tier", "tier_label", "maturity_tier", "level"),
      canonical_tier: tierFromScore(score),
      answer_labels: answerLabels,
      segment: str(r, "segment"),
      target_markets: (r["target_markets"] as unknown) ?? null,
      access_pin: str(r, "access_pin", "pin"),
      role: str(r, "role"),
    },
  };
  return { payload, email, key };
}

export type MigrateInput = {
  dry_run?: boolean;
  email?: string;
  limit?: number;
  confirm_calibrated?: boolean;
  create_users?: boolean;
};

export async function runMigrateReadinessIQ(input: MigrateInput) {
  const dry_run = input.dry_run ?? true;
  if (!dry_run && input.confirm_calibrated !== true) {
    return { ok: false as const, error: "calibration_not_confirmed", detail: "A real run requires confirm_calibrated: true." };
  }
  const limit = Math.min(Math.max(input.limit ?? 1000, 1), 5000);
  const rows = await readLegacyRows({ limit, email: input.email });

  const transformed: Transformed[] = [];
  const skipped: Skipped[] = [];
  for (const r of rows) {
    const t = transformRow(r);
    if ("reason" in t) skipped.push(t); else transformed.push(t);
  }

  const byKey: Record<string, number> = {};
  const emailKeys = new Map<string, Set<string>>();
  for (const t of transformed) {
    byKey[t.key] = (byKey[t.key] ?? 0) + 1;
    if (!emailKeys.has(t.email)) emailKeys.set(t.email, new Set());
    emailKeys.get(t.email)!.add(t.key);
  }
  const multiIq = [...emailKeys.values()].filter(s => s.size > 1).length;

  const summary = {
    read: rows.length,
    transformed: transformed.length,
    skipped: skipped.length,
    skipped_rows: skipped,
    by_assessment_key: byKey,
    distinct_emails: emailKeys.size,
    multi_iq_contacts: multiIq,
  };

  if (dry_run) {
    return { ok: true as const, dry_run: true, ...summary, sample_payloads: transformed.slice(0, 5).map(t => t.payload) };
  }

  // ---- real run: users first (optional), then batched import through the shared path
  const users = { created: 0, existing: 0, errors: [] as { email: string; detail: string }[] };
  if (input.create_users) {
    const { runImportLegacyUser } = await import("@/lib/hub/admin/legacy-users.server");
    for (const [email] of emailKeys) {
      const meta = transformed.find(t => t.email === email)?.payload.metadata ?? {};
      const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || undefined;
      // No invite: the Hub has no SMTP, so an invite would report success and deliver nothing.
      const res = await runImportLegacyUser({
        email,
        full_name: fullName,
        company: (meta.company as string | undefined) ?? undefined,
        send_invite: false,
      });
      if (!res.ok) users.errors.push({ email, detail: res.detail ?? res.error });
      else if (res.created) users.created++;
      else users.existing++;
    }
  }

  const { runImportLegacySubmissions } = await import("@/lib/hub/admin/legacy-submissions.server");
  const batches: Array<{
    batch: number;
    size: number;
    results: ImportRowResult[];
    hubspot: ImportHubspotResult[] | "skipped";
  }> = [];
  const totals = { inserted: 0, duplicate: 0, insert_error: 0 };
  const hubspotSkipped: { email: string; skipped: string[] }[] = [];
  const hubspotErrors: { email: string; detail?: string }[] = [];

  for (let i = 0; i < transformed.length; i += 500) {
    const slice = transformed.slice(i, i + 500).map(t => t.payload);
    const out = await runImportLegacySubmissions({ submissions: slice });
    for (const r of out.results) totals[r.status] = (totals[r.status] ?? 0) + 1;
    if (Array.isArray(out.hubspot)) {
      for (const h of out.hubspot) {
        if (h.skipped?.length) hubspotSkipped.push({ email: h.email, skipped: h.skipped });
        if (h.status === "error") hubspotErrors.push({ email: h.email, detail: h.detail });
      }
    }
    batches.push({ batch: i / 500 + 1, size: slice.length, results: out.results, hubspot: out.hubspot });
  }

  return {
    ok: true as const,
    dry_run: false,
    ...summary,
    users,
    totals,
    hubspot_skipped_properties: hubspotSkipped,
    hubspot_errors: hubspotErrors,
    batches,
  };
}
