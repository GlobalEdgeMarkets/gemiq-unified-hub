// Brand messaging: client-safe schemas, merge rule, ordering and vocabulary checks.
// Server storage/versioning lives in src/lib/hub/messaging.server.ts.
import { z } from "zod";
import manifest from "@/lib/hub/manifest.json";

export const PROPERTIES = ["globaledgemarkets.com", "gemiq", "globaledgetalk"] as const;
export type Property = (typeof PROPERTIES)[number];
export const SCOPES = ["shared", ...PROPERTIES] as const;
export type Scope = (typeof SCOPES)[number];
export const STATUSES = ["approved", "draft", "needs_input"] as const;
export type ItemStatus = (typeof STATUSES)[number];
export const RELATED_KEYS = ["gtmiq", "salesiq", "productiq", "aitransformiq", "uxiq", "tariffiq"] as const;

export const PROPERTY_LABEL: Record<Scope, string> = {
  shared: "Shared",
  "globaledgemarkets.com": "globaledgemarkets.com",
  gemiq: "GEM.IQ",
  globaledgetalk: "GlobalEdgeTalk",
};
export const STATUS_LABEL: Record<ItemStatus, string> = { approved: "Approved", draft: "Draft", needs_input: "Needs input" };

export const ItemSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/, "Use lowercase words separated by dots, e.g. hero.headline"),
  scope: z.enum(SCOPES),
  label: z.string().max(200).default(""),
  value: z.string().max(5000),
  notes: z.string().max(2000).default(""),
  status: z.enum(STATUSES),
  order: z.number().int(),
  related: z.enum(RELATED_KEYS).optional().nullable(),
});
export type MessagingItem = z.infer<typeof ItemSchema>;

export const RuleSchema = z.object({
  use: z.string().max(500),
  avoid: z.array(z.string().min(1).max(100)).max(30),
  why: z.string().max(500).default(""),
});
export type VocabRule = z.infer<typeof RuleSchema>;

export const BodySchema = z.object({
  items: z.array(ItemSchema).max(1000),
  vocabulary: z.array(RuleSchema).max(200),
}).superRefine((b, ctx) => {
  const seen = new Set<string>();
  for (const i of b.items) {
    const id = `${i.scope}|${i.key}`;
    if (seen.has(id)) ctx.addIssue({ code: "custom", message: `"${i.key}" appears twice in ${PROPERTY_LABEL[i.scope]}` });
    seen.add(id);
  }
});
export type MessagingBody = z.infer<typeof BodySchema>;

export type EffectiveItem = MessagingItem & { source: "shared" | "own"; overrides: boolean };

/** Shared + property's own items; own wins on the same key. Sorted by order. */
export function effectiveSet(body: MessagingBody, property: Property, opts: { approvedOnly?: boolean } = {}): EffectiveItem[] {
  const map = new Map<string, EffectiveItem>();
  for (const i of body.items) if (i.scope === "shared") map.set(i.key, { ...i, source: "shared", overrides: false });
  for (const i of body.items) if (i.scope === property) map.set(i.key, { ...i, source: "own", overrides: map.has(i.key) });
  let out = [...map.values()];
  if (opts.approvedOnly) out = out.filter((i) => i.status === "approved");
  return out.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
}

/** The public JSON for one property (Approved only). */
export function publicPayload(body: MessagingBody, property: Property, version: number, publishedAt: string | null) {
  const items = effectiveSet(body, property, { approvedOnly: true }).map((i) => ({
    key: i.key, label: i.label, value: fillPlaceholders(i.value), source: i.source, order: i.order, ...(i.related ? { related: i.related } : {}),
  }));
  return {
    property, version, published_at: publishedAt,
    items,
    by_key: Object.fromEntries(items.map((i) => [i.key, i.value])),
    vocabulary: body.vocabulary,
  };
}

/** Which properties' public output differs between two bodies. */
export function changedProperties(prev: MessagingBody | null, next: MessagingBody): Property[] {
  return PROPERTIES.filter((p) => {
    const a = prev ? JSON.stringify(publicPayload(prev, p, 0, null)) : "";
    return a !== JSON.stringify(publicPayload(next, p, 0, null));
  });
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/** Avoid-terms found in a value (whole words, case-insensitive). */
export function findAvoidTerms(value: string, vocabulary: VocabRule[]): { term: string; rule: VocabRule }[] {
  const hits: { term: string; rule: VocabRule }[] = [];
  for (const rule of vocabulary) {
    for (const term of rule.avoid) {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(term)}(?=$|[^\\p{L}\\p{N}])`, "iu");
      if (re.test(value)) hits.push({ term, rule });
    }
  }
  return hits;
}

const ALLOWED_EXACT = new Set([
  "globaledgemarkets.com", "www.globaledgemarkets.com", "globaledgetalk.live", "www.globaledgetalk.live",
  "gemiq-unified-hub.lovable.app",
  "id-preview--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app",
  "project--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app",
  "project--d4b3f62b-5101-4b21-a476-4e0635e07df6-dev.lovable.app",
  // GlobalEdgeTalk (Lovable project d420b9a2-…)
  "id-preview--d420b9a2-86d5-435c-8c40-2cdcf3cf9221.lovable.app",
  "project--d420b9a2-86d5-435c-8c40-2cdcf3cf9221.lovable.app",
  "project--d420b9a2-86d5-435c-8c40-2cdcf3cf9221-dev.lovable.app",
]);

/** CORS allowlist for the public messaging feed. */
export function isMessagingOriginAllowed(origin: string, extraHosts: string[] = []): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return u.hostname === "localhost" && u.protocol === "http:";
    const h = u.hostname;
    return ALLOWED_EXACT.has(h) || h.endsWith(".globaledgemarkets.com") || extraHosts.includes(h);
  } catch {
    return false;
  }
}

// ---- Price placeholders: prices are decided by the manifest plan list, never typed into copy ----

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
export function priceTokens(): Record<string, string> {
  const p = manifest.pricing;
  const t: Record<string, string> = { "price.single": usd(p.one_time.amount), "price.guarantee_days": String(p.guarantee.days) };
  for (const plan of p.plans) {
    const name = plan.id.replace(/^gemiq_/, "");
    t[`price.${name}`] = usd(plan.amount);
  }
  return t;
}
export const PRICE_TOKEN_KEYS = Object.keys(priceTokens());

/** Replace {price.x} tokens with live prices; unknown tokens are left as typed. */
export function fillPlaceholders(value: string, tokens = priceTokens()): string {
  return value.replace(/\{(price\.[a-z0-9_]+)\}/g, (m, k: string) => tokens[k] ?? m);
}

/** Overlay approved iq.<key>.* items onto an assessment page's built-in wording. */
export function applyIqCopy<T extends { key: string; tagline: string; domain: string; body: string; intro: string; overview: string[]; audience: string[]; outcomes: string[] }>(
  product: T, byKey: Record<string, string> | null | undefined,
): T {
  if (!byKey) return product;
  const g = (f: string) => byKey[`iq.${product.key}.${f}`];
  const list = (f: string, base: string[]) => base.map((v, i) => g(`${f}.${i + 1}`) ?? v);
  return {
    ...product,
    tagline: g("tagline") ?? product.tagline,
    domain: g("domain") ?? product.domain,
    body: g("body") ?? product.body,
    intro: g("intro") ?? product.intro,
    overview: list("overview", product.overview),
    audience: list("audience", product.audience),
    outcomes: list("outcome", product.outcomes),
  };
}

/** Assessment-site wording catalog: { iqKey: [{ key, label, value, notes? }] }. */
export type IqSiteCopy = Record<string, { key: string; label: string; value: string; notes?: string }[]>;

/**
 * Add assessment-site wording to a messaging body as GEM.IQ Draft items, grouped by IQ
 * in catalog order after existing gemiq items. Never overwrites an existing scope+key,
 * and leaves {name}/{questions} tokens untouched (the sites fill them). Mutates body.
 */
export function addIqSiteCopy(body: MessagingBody, catalog: IqSiteCopy) {
  const have = new Set(body.items.map((i) => `${i.scope}|${i.key}`));
  let order = Math.max(0, ...body.items.filter((i) => i.scope === "gemiq").map((i) => i.order));
  let added = 0, existing = 0;
  for (const [iq, entries] of Object.entries(catalog)) {
    for (const e of entries) {
      if (have.has(`gemiq|${e.key}`)) { existing++; continue; }
      order += 10; added++; have.add(`gemiq|${e.key}`);
      body.items.push({ key: e.key, scope: "gemiq", label: e.label, value: e.value, notes: e.notes ?? "", status: "draft", order, related: iq as MessagingItem["related"] });
    }
  }
  return { added, existing };
}
