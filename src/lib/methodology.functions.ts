import { createServerFn } from "@tanstack/react-start";

/** Public: Hub-wide methodology plus each live assessment's published methodology. */
export const getMethodology = createServerFn({ method: "GET" }).handler(async () => {
  const { getCompositeConfig } = await import("@/lib/hub/composite.server");
  const { LIVE_REGISTRY } = await import("@/lib/hub/assessments");
  const { publishedFor } = await import("@/lib/hub/content.server");
  const cfg = await getCompositeConfig().catch(async () => {
    const m = await import("@/lib/composite");
    return { settings: m.DEFAULT_COMPOSITE, methodology: m.DEFAULT_METHODOLOGY, updated_at: null };
  });
  const assessments = await Promise.all(
    LIVE_REGISTRY.map(async (s) => {
      const pub = await publishedFor(s.key).catch(() => null) as { body?: { methodology?: unknown; sections?: Array<{ title: string; rationale?: string }> } } | null;
      return {
        key: s.key,
        name: s.displayName,
        weight: cfg.settings.weights[s.key] ?? 1,
        methodology: (pub?.body?.methodology ?? null) as { summary?: string; frameworks?: string[]; comparison?: string; references?: { title: string; url?: string }[] } | null,
        sections: (pub?.body?.sections ?? []).filter((x) => x.rationale).map((x) => ({ title: x.title, rationale: x.rationale! })),
      };
    }),
  );
  return { methodology: cfg.methodology, tiers: cfg.settings.tiers, min_for_tier: cfg.settings.min_for_tier, assessments };
});
