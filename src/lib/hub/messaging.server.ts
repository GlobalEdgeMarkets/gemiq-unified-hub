// Brand messaging storage: one draft + one published numbered version of the whole set
// (same routine as hub_iq_content), plus publish hooks. Admin-only callers; public read
// goes through /api/public/messaging (Approved items only).
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { BodySchema, changedProperties, type MessagingBody } from "@/lib/messaging";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createHubServiceClient();
}

export type MessagingVersion = {
  id: string; version: number; status: "draft" | "published" | "archived";
  body: MessagingBody; note: string | null; created_by: string | null; created_at: string; published_at: string | null;
};
export type PublishHook = { url: string; enabled: boolean; label?: string };

export async function listVersions(): Promise<MessagingVersion[]> {
  const { data, error } = await db().from("hub_messaging_versions").select("*").order("version", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function publishedVersion(): Promise<MessagingVersion | null> {
  const { data } = await db().from("hub_messaging_versions").select("*").eq("status", "published").maybeSingle();
  return data ?? null;
}

async function nextVersion() {
  const { data } = await db().from("hub_messaging_versions").select("version").order("version", { ascending: false }).limit(1);
  return ((data?.[0]?.version as number | undefined) ?? 0) + 1;
}

export async function saveDraft(raw: unknown, by: string, note?: string) {
  const body = BodySchema.parse(raw);
  const { data: draft } = await db().from("hub_messaging_versions").select("id").eq("status", "draft").maybeSingle();
  if (draft) {
    const { error } = await db().from("hub_messaging_versions").update({ body, note: note ?? null, created_by: by }).eq("id", draft.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db().from("hub_messaging_versions").insert({ version: await nextVersion(), status: "draft", body, note: note ?? null, created_by: by });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function discardDraft() {
  await db().from("hub_messaging_versions").delete().eq("status", "draft");
  return { ok: true };
}

export async function getSettings(): Promise<{ publish_hooks: PublishHook[]; last_hook_results: unknown }> {
  const { data } = await db().from("hub_messaging_settings").select("publish_hooks,last_hook_results").eq("id", true).maybeSingle();
  return { publish_hooks: (data?.publish_hooks as PublishHook[]) ?? [], last_hook_results: data?.last_hook_results ?? null };
}

export async function saveHooks(hooks: PublishHook[], by: string) {
  const { error } = await db().from("hub_messaging_settings")
    .upsert({ id: true, publish_hooks: hooks, updated_by: by, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function runHooks(version: number, properties: string[]) {
  const { publish_hooks } = await getSettings();
  const secret = process.env.HUB_MESSAGING_SECRET ?? "";
  const results: { url: string; ok: boolean; text: string }[] = [];
  for (const h of publish_hooks.filter((x) => x.enabled)) {
    try {
      const res = await fetch(h.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(secret ? { "x-hub-messaging-secret": secret } : {}) },
        body: JSON.stringify({ event: "messaging.published", version, properties_changed: properties }),
        signal: AbortSignal.timeout(10000),
      });
      results.push({ url: h.url, ok: res.ok, text: res.ok ? `${h.label || h.url} answered OK` : `${h.label || h.url} answered ${res.status}` });
    } catch (e) {
      results.push({ url: h.url, ok: false, text: `${h.label || h.url} could not be reached (${(e as Error).name === "TimeoutError" ? "took over 10 seconds" : "connection failed"})` });
    }
  }
  await db().from("hub_messaging_settings").update({ last_hook_results: { at: new Date().toISOString(), version, results } }).eq("id", true);
  return results;
}

export async function publishDraft(by: string) {
  const { data: draft } = await db().from("hub_messaging_versions").select("id,version,body").eq("status", "draft").maybeSingle();
  if (!draft) throw new Error("There is no draft to publish.");
  const prev = await publishedVersion();
  await db().from("hub_messaging_versions").update({ status: "archived" }).eq("status", "published");
  const { error } = await db().from("hub_messaging_versions")
    .update({ status: "published", published_at: new Date().toISOString(), created_by: by }).eq("id", draft.id);
  if (error) throw new Error(error.message);
  const changed = changedProperties(prev?.body ?? null, draft.body as MessagingBody);
  const hooks = changed.length ? await runHooks(draft.version as number, changed) : [];
  return { version: draft.version as number, changed, hooks };
}

/** Make an older version live again = copy it into a new draft and publish as the next number. */
export async function rollbackTo(version: number, by: string) {
  const { data: old } = await db().from("hub_messaging_versions").select("body").eq("version", version).maybeSingle();
  if (!old) throw new Error("That version doesn't exist.");
  await discardDraft();
  await saveDraft(old.body, by, `Made version ${version} live again`);
  return await publishDraft(by);
}

/**
 * Pull the Hub's built-in assessment page wording into the draft as GEM.IQ items
 * (status Draft, so pages keep their built-in text until approved), and switch
 * typed prices to live {price.*} placeholders. Existing keys are never overwritten.
 */
export async function importIqCopy(by: string) {
  const { IQ_PRODUCTS } = await import("@/lib/iq-catalog");
  const { data: draft } = await db().from("hub_messaging_versions").select("body").eq("status", "draft").maybeSingle();
  const base = (draft?.body ?? (await publishedVersion())?.body ?? { items: [], vocabulary: [] }) as MessagingBody;
  const body: MessagingBody = structuredClone(base);
  const have = new Set(body.items.map((i) => `${i.scope}|${i.key}`));
  let order = Math.max(1000, ...body.items.map((i) => i.order));
  let added = 0;
  const add = (related: string, key: string, label: string, value: string) => {
    if (have.has(`gemiq|${key}`)) return;
    order += 10; added++;
    body.items.push({ key, scope: "gemiq", label, value, notes: "Imported from the assessment page", status: "draft", order, related: related as MessagingBody["items"][number]["related"] });
  };
  for (const p of IQ_PRODUCTS) {
    const k = p.key;
    add(k, `iq.${k}.tagline`, `${p.name} — tagline`, p.tagline);
    add(k, `iq.${k}.domain`, `${p.name} — domain`, p.domain);
    add(k, `iq.${k}.body`, `${p.name} — card text`, p.body);
    add(k, `iq.${k}.intro`, `${p.name} — intro`, p.intro);
    p.overview.forEach((v, i) => add(k, `iq.${k}.overview.${i + 1}`, `${p.name} — overview paragraph ${i + 1}`, v));
    p.audience.forEach((v, i) => add(k, `iq.${k}.audience.${i + 1}`, `${p.name} — who it's for ${i + 1}`, v));
    p.outcomes.forEach((v, i) => add(k, `iq.${k}.outcome.${i + 1}`, `${p.name} — outcome ${i + 1}`, v));
  }
  const prices: Record<string, [RegExp, string]> = {
    "plan.subscription": [/\$249\/month/, "{price.complete_monthly}/month"],
    "plan.single": [/\$179/, "{price.single}"],
    "plan.guarantee": [/^14-day/, "{price.guarantee_days}-day"],
  };
  let priced = 0;
  for (const i of body.items) {
    const r = prices[i.key];
    if (r && r[0].test(i.value)) { i.value = i.value.replace(r[0], r[1]); priced++; }
  }
  const { addIqSiteCopy } = await import("@/lib/messaging");
  const siteCopy = (await import("@/lib/hub/iq-site-copy.json")).default;
  const site = addIqSiteCopy(body, siteCopy);
  // Hub home page wording (home.*), Draft, after everything else.
  const { HOME_COPY } = await import("@/lib/hub-page-copy");
  let homeAdded = 0;
  let homeOrder = Math.max(0, ...body.items.filter((i) => i.scope === "gemiq").map((i) => i.order));
  for (const e of HOME_COPY) {
    if (body.items.some((i) => i.scope === "gemiq" && i.key === e.key)) continue;
    homeOrder += 10; homeAdded++;
    body.items.push({ key: e.key, scope: "gemiq", label: e.label, value: e.value, notes: "Imported from the Hub home page", status: "draft", order: homeOrder });
  }
  await saveDraft(body, by, "Added assessment page wording");
  return { added: added + homeAdded, priced, site_added: site.added, site_existing: site.existing };
}
