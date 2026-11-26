// Dimension ID registry (manifest `dimensions`). Client-safe.
// Keys are permanent machine IDs — never join or compare on display titles.
import manifest from "./manifest.json";

type Registry = { spine: string[]; by_assessment: Record<string, string[]>; rules: string };
const REG = (manifest as unknown as { dimensions: Registry }).dimensions;

export const DIMENSION_SPINE: readonly string[] = REG.spine;
export function registryKeys(assessmentKey: string): string[] | null {
  const k = REG.by_assessment[assessmentKey];
  return k && k.length ? k : null;
}
export const isSpineKey = (k: string) => DIMENSION_SPINE.includes(k);

export type DimensionKeyCheck = {
  dimension_keys_ok: boolean;
  missing: string[];
  unknown: string[];
  empty: boolean;
  registry_empty: boolean;
};

/** Report-only: compare a submission's dimension keys with the registry. */
export function checkDimensionKeys(assessmentKey: string, dimensions: unknown): DimensionKeyCheck {
  const sent = dimensions && typeof dimensions === "object" && !Array.isArray(dimensions)
    ? Object.keys(dimensions as Record<string, unknown>) : [];
  const reg = registryKeys(assessmentKey);
  if (!reg) return { dimension_keys_ok: false, missing: [], unknown: [], empty: sent.length === 0, registry_empty: true };
  const missing = reg.filter((k) => !sent.includes(k));
  const unknown = sent.filter((k) => !reg.includes(k));
  const empty = sent.length === 0;
  return { dimension_keys_ok: !empty && missing.length === 0 && unknown.length === 0, missing, unknown, empty, registry_empty: false };
}

export function describeDimensionCheck(c: DimensionKeyCheck | null): string {
  if (!c) return "no submissions yet";
  if (c.registry_empty) return "no registry yet";
  if (c.empty) return "empty";
  if (c.dimension_keys_ok) return "OK";
  const parts: string[] = [];
  if (c.unknown.length) parts.push(`${c.unknown.length} unknown`);
  if (c.missing.length) parts.push(`${c.missing.length} missing`);
  return parts.join(" / ");
}

/** Cross-IQ capability roll-up: grouped by key; only spine keys merge across assessments. */
export function rollupDimensions(results: { assessment_key: string; display_name: string; dimensions: { key: string; label: string; score: number }[] }[]) {
  const map = new Map<string, { label: string; total: number; count: number; sources: Set<string> }>();
  for (const r of results) for (const d of r.dimensions) {
    const id = isSpineKey(d.key) ? d.key : `${r.assessment_key}:${d.key}`;
    const e = map.get(id) ?? { label: d.label, total: 0, count: 0, sources: new Set<string>() };
    e.total += d.score; e.count += 1; e.sources.add(r.display_name);
    map.set(id, e);
  }
  return [...map.entries()]
    .map(([key, e]) => ({ key, label: e.label, score: Math.round(e.total / e.count), sources: [...e.sources] }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}
