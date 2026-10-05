// Server-only: load/save combined-score settings and the Hub-wide methodology.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { mergeComposite, mergeMethodology, type CompositeSettings, type Methodology } from "@/lib/composite";

const db = () => createHubServiceClient();

export async function getCompositeConfig(): Promise<{ settings: CompositeSettings; methodology: Methodology; updated_at: string | null }> {
  const { data } = await db().from("hub_composite_settings").select("settings,methodology,updated_at").maybeSingle();
  return {
    settings: mergeComposite(data?.settings),
    methodology: mergeMethodology(data?.methodology),
    updated_at: (data?.updated_at as string | undefined) ?? null,
  };
}

export async function saveCompositeConfig(patch: { settings?: CompositeSettings; methodology?: Methodology }, by: string) {
  const row: Record<string, unknown> = { id: true, updated_at: new Date().toISOString(), updated_by: by };
  if (patch.settings) row.settings = patch.settings;
  if (patch.methodology) row.methodology = patch.methodology;
  const { error } = await db().from("hub_composite_settings").upsert(row as never);
  if (error) throw new Error(`Could not save: ${error.message}`);
  return { ok: true };
}
