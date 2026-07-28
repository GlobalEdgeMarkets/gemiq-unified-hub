// Server-only logic for the unified Hub dashboard.
// Read-only: resolves the signed-in Hub user's submissions across every IQ,
// their subscription state, and cross-IQ recommendations.
import { getRequest } from "@tanstack/react-start/server";
import { createHubSupabaseSSR, createHubServiceClient } from "@/lib/hub/supabase-server";
import { REGISTRY, REGISTRY_BY_KEY } from "@/lib/hub/assessments";
import { normalizeTier, tierFromScore } from "@/lib/hub/assessments/tiers";
import manifest from "@/lib/hub/manifest.json";

export type DashboardDimension = { key: string; label: string; score: number };

export type DashboardResult = {
  assessment_key: string;
  display_name: string;
  url: string;
  report_url: string | null;
  score: number | null;
  tier: string | null;
  submitted_at: string;
  attempts: number;
  dimensions: DashboardDimension[];
  strongest: DashboardDimension | null;
  weakest: DashboardDimension | null;
};

export type DashboardRecommendation = {
  assessment_key: string;
  display_name: string;
  url: string;
  reason: string;
};

export type CompositeDimension = {
  key: string;
  label: string;
  score: number;
  /** Display names of the IQs contributing to this rolled-up dimension. */
  sources: string[];
};

export type DashboardComposite = {
  score: number | null;
  tier: string | null;
  coverage: { completed: number; total: number };
  strengths: CompositeDimension[];
  gaps: CompositeDimension[];
  /** Per-IQ contribution to the composite, ordered strongest first. */
  contributions: Array<{ assessment_key: string; display_name: string; score: number | null; tier: string | null }>;
};

export type DashboardData = {
  user: { email: string; first_name: string | null; company: string | null };
  subscription: {
    status: string;
    trialing: boolean;
    trial_ends_at: string | null;
    trial_assessments_used: number;
    trial_assessment_limit: number;
    current_period_end: string | null;
  } | null;
  results: DashboardResult[];
  recommendations: DashboardRecommendation[];
  composite: DashboardComposite;
  stats: { completed: number; average_score: number | null; total_submissions: number };
};

const MANIFEST_URLS: Record<string, string> = Object.fromEntries(
  (manifest.assessments ?? []).map((a: { key: string; url: string }) => [a.key, a.url]),
);

function iqUrl(key: string) {
  return MANIFEST_URLS[key] ?? `https://${key}.globaledgemarkets.com`;
}

function prettify(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toDimensions(raw: unknown): DashboardDimension[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: DashboardDimension[] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    if (!Number.isFinite(n)) continue;
    // Dimension scores arrive on a 0-100 or 0-9 scale depending on the IQ.
    const pct = n <= 10 ? Math.round((n / 9) * 100) : Math.round(n);
    out.push({ key: k, label: prettify(k), score: Math.max(0, Math.min(100, pct)) });
  }
  return out;
}

function pickReportUrl(row: { metadata: unknown; detail?: unknown }): string | null {
  for (const bag of [row.metadata, (row as { detail?: unknown }).detail]) {
    if (bag && typeof bag === "object") {
      const rec = bag as Record<string, unknown>;
      const v = rec.report_url ?? rec.reportUrl ?? rec.result_url;
      if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
    }
  }
  return null;
}

/**
 * Strict auth guard: never throws. Any missing/invalid session — or any
 * unexpected failure while resolving it — resolves to `null` so the route
 * renders its sign-in flow instead of surfacing an "Unauthorized" runtime error.
 */
export async function loadDashboard(): Promise<DashboardData | null> {
  try {
    return await loadDashboardForSession();
  } catch {
    return null;
  }
}

async function loadDashboardForSession(): Promise<DashboardData | null> {
  const request = getRequest();
  if (!request?.headers) return null;

  const supabase = createHubSupabaseSSR(request, []);

  // Cookie session first (cross-subdomain SSO), then bearer token fallback.
  let user: { id: string; email?: string | null } | null = null;
  const cookieUser = await supabase.auth.getUser().catch(() => null);
  user = cookieUser?.data?.user ?? null;

  if (!user) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (token) {
      const bearerUser = await supabase.auth.getUser(token).catch(() => null);
      user = bearerUser?.data?.user ?? null;
    }
  }

  if (!user?.email) return null;



  const email = user.email.toLowerCase();

  const [profileRes, subRes] = await Promise.all([
    supabase.from("profiles").select("first_name,company").eq("id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status,trial_ends_at,trial_assessments_used,trial_assessment_limit,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Submissions may predate the account (migrated rows carry the email but no
  // user_id), so match on both. Service client is read-only here and scoped to
  // the verified caller's own user_id/email.
  const service = createHubServiceClient();
  const { data: rows } = await service
    .from("submissions")
    .select("assessment_key,score,tier,dimensions,metadata,submitted_at,user_id,email")
    .or(`user_id.eq.${user.id},email.eq.${email}`)
    .order("submitted_at", { ascending: false })
    .limit(200);

  const all = (rows ?? []) as Array<{
    assessment_key: string;
    score: number | null;
    tier: string | null;
    dimensions: unknown;
    metadata: unknown;
    submitted_at: string;
  }>;

  const byKey = new Map<string, typeof all>();
  for (const r of all) {
    const list = byKey.get(r.assessment_key) ?? [];
    list.push(r);
    byKey.set(r.assessment_key, list);
  }

  const results: DashboardResult[] = [];
  for (const [key, list] of byKey) {
    const latest = list[0];
    const dims = toDimensions(latest.dimensions).sort((a, b) => b.score - a.score);
    results.push({
      assessment_key: key,
      display_name: REGISTRY_BY_KEY[key]?.displayName ?? prettify(key),
      url: iqUrl(key),
      report_url: pickReportUrl(latest),
      score: typeof latest.score === "number" ? Math.round(latest.score) : null,
      tier: normalizeTier(latest.tier) ?? tierFromScore(latest.score),
      submitted_at: latest.submitted_at,
      attempts: list.length,
      dimensions: dims,
      strongest: dims[0] ?? null,
      weakest: dims.length ? dims[dims.length - 1] : null,
    });
  }
  results.sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));

  // Cross-IQ recommendations: every registered IQ the user has not completed,
  // prioritised by how it relates to what they already scored.
  const taken = new Set(results.map((r) => r.assessment_key));
  const strongest = [...results].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const weakestIQ = [...results].sort((a, b) => (a.score ?? 101) - (b.score ?? 101))[0];

  const AFFINITY: Record<string, string[]> = {
    gtmiq: ["salesiq", "productiq"],
    salesiq: ["gtmiq", "aitransformiq"],
    productiq: ["uxiq", "aitransformiq"],
    aitransformiq: ["techservicesiq", "productiq"],
    uxiq: ["productiq", "gtmiq"],
    tariffiq: ["gtmiq", "techservicesiq"],
    techservicesiq: ["aitransformiq", "salesiq"],
    readinessiq: ["gtmiq", "salesiq", "productiq", "aitransformiq"],
  };

  const suggested = new Set<string>();
  for (const r of results) for (const k of AFFINITY[r.assessment_key] ?? []) if (!taken.has(k)) suggested.add(k);

  const recommendations: DashboardRecommendation[] = REGISTRY.filter((s) => !taken.has(s.key))
    .map((s) => {
      let reason = `Benchmark a new discipline and add ${s.displayName} to your maturity profile.`;
      if (suggested.has(s.key) && strongest) {
        reason = `Pairs naturally with your ${strongest.display_name} results — the next step after scoring ${strongest.score ?? "—"}.`;
      } else if (weakestIQ?.weakest) {
        reason = `Your lowest dimension so far is ${weakestIQ.weakest.label} (${weakestIQ.weakest.score}) — ${s.displayName} goes deeper on adjacent capability.`;
      }
      return { assessment_key: s.key, display_name: s.displayName, url: iqUrl(s.key), reason };
    })
    .sort((a, b) => Number(suggested.has(b.assessment_key)) - Number(suggested.has(a.assessment_key)))
    .slice(0, 4);

  const scores = results.map((r) => r.score).filter((n): n is number => typeof n === "number");

  const sub = subRes.data as DashboardData["subscription"] extends null ? never : any;

  return {
    user: {
      email,
      first_name: (profileRes.data as { first_name?: string | null } | null)?.first_name ?? null,
      company: (profileRes.data as { company?: string | null } | null)?.company ?? null,
    },
    subscription: sub
      ? {
          status: sub.status ?? "inactive",
          trialing: sub.status === "trialing" || (!!sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()),
          trial_ends_at: sub.trial_ends_at ?? null,
          trial_assessments_used: sub.trial_assessments_used ?? 0,
          trial_assessment_limit: sub.trial_assessment_limit ?? 1,
          current_period_end: sub.current_period_end ?? null,
        }
      : null,
    results,
    recommendations,
    stats: {
      completed: results.length,
      average_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      total_submissions: all.length,
    },
  };
}
