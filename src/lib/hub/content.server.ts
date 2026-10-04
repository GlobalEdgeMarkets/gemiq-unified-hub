// Hub-controlled assessment content: drafts, numbered published versions, rollback,
// import from an IQ app, and score re-checks on submit.
import { createHubServiceClient } from "@/lib/hub/supabase-server";
import { ContentBodySchema, computeScore, type ContentBody } from "@/lib/iq-content";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createHubServiceClient();
}

export type ContentRow = {
  id: string; assessment_key: string; version: number; status: "draft" | "published" | "archived";
  body: ContentBody; note: string | null; created_by: string | null; created_at: string; published_at: string | null;
};

export async function listVersions(key: string): Promise<ContentRow[]> {
  const { data, error } = await db().from("hub_iq_content").select("*").eq("assessment_key", key).order("version", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function publishedFor(key: string): Promise<ContentRow | null> {
  const { data } = await db().from("hub_iq_content").select("*").eq("assessment_key", key).eq("status", "published").maybeSingle();
  return data ?? null;
}

export async function publishedVersions(): Promise<Record<string, number>> {
  const { data } = await db().from("hub_iq_content").select("assessment_key,version").eq("status", "published");
  return Object.fromEntries(((data ?? []) as { assessment_key: string; version: number }[]).map((r) => [r.assessment_key, r.version]));
}

async function nextVersion(key: string) {
  const { data } = await db().from("hub_iq_content").select("version").eq("assessment_key", key).order("version", { ascending: false }).limit(1);
  return ((data?.[0]?.version as number | undefined) ?? 0) + 1;
}

export async function saveDraft(key: string, raw: unknown, by: string, note?: string) {
  const body = ContentBodySchema.parse(raw);
  const { data: draft } = await db().from("hub_iq_content").select("id").eq("assessment_key", key).eq("status", "draft").maybeSingle();
  if (draft) {
    const { error } = await db().from("hub_iq_content").update({ body, note: note ?? null, created_by: by }).eq("id", draft.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db().from("hub_iq_content").insert({
      assessment_key: key, version: await nextVersion(key), status: "draft", body, note: note ?? null, created_by: by,
    });
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function discardDraft(key: string) {
  await db().from("hub_iq_content").delete().eq("assessment_key", key).eq("status", "draft");
  return { ok: true };
}

export async function publishDraft(key: string, by: string) {
  const { data: draft } = await db().from("hub_iq_content").select("id,version").eq("assessment_key", key).eq("status", "draft").maybeSingle();
  if (!draft) throw new Error("There is no draft to publish.");
  await db().from("hub_iq_content").update({ status: "archived" }).eq("assessment_key", key).eq("status", "published");
  const { error } = await db().from("hub_iq_content").update({ status: "published", published_at: new Date().toISOString(), created_by: by }).eq("id", draft.id);
  if (error) throw new Error(error.message);
  return { version: draft.version as number };
}

/** Rollback = publish a copy of an older version as a new version number. */
export async function rollbackTo(key: string, version: number, by: string) {
  const { data: old } = await db().from("hub_iq_content").select("body").eq("assessment_key", key).eq("version", version).maybeSingle();
  if (!old) throw new Error("That version doesn't exist.");
  await discardDraft(key);
  await saveDraft(key, old.body, by, `Rolled back to version ${version}`);
  return await publishDraft(key, by);
}

/** Ask the app for its current built-in content and store it as a draft. */
export async function importFromApp(key: string, by: string) {
  const { listApps } = await import("@/lib/hub/app-control.server");
  const app = (await listApps()).find((a) => a.key === key);
  if (!app?.status_url) throw new Error("This assessment has no status link registered.");
  const url = app.status_url.replace(/hub-status\/?$/, "hub-content-export");
  const secret = process.env.HUB_PURGE_SECRET;
  if (!secret) throw new Error("HUB_PURGE_SECRET is not set.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-purge-secret": secret },
    body: "{}",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) throw new Error(`${app.name} hasn't added its content export link yet. Paste the Content prompt into it first.`);
  if (!res.ok) throw new Error(`${app.name} answered with an error (${res.status}).`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) throw new Error(`${app.name} sent a web page instead of its content. Publish it after adding the export link.`);
  const j = await res.json();
  const parsed = ContentBodySchema.safeParse(j?.content ?? j);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(`${app.name}'s content doesn't match the expected format (${first?.path.join(".")}: ${first?.message}).`);
  }
  await saveDraft(key, parsed.data, by, `Imported from ${app.name}`);
  return { sections: parsed.data.sections.length, questions: parsed.data.sections.reduce((n, s) => n + s.questions.length, 0) };
}

/** On submit: recompute the score from the content version the app used and record any mismatch. */
export async function checkScore(id: string, key: string, version: number | null, reported: number | null, answers: unknown) {
  try {
    if (version == null || !answers || typeof answers !== "object") return;
    const { data: row } = await db().from("hub_iq_content").select("body").eq("assessment_key", key).eq("version", version).maybeSingle();
    if (!row) {
      await db().from("submissions").update({ score_check: { ok: false, reason: `unknown content version ${version}` } }).eq("id", id);
      return;
    }
    const { score } = computeScore(row.body as ContentBody, answers as Record<string, unknown>);
    const diff = score == null || reported == null ? null : Math.abs(score - reported);
    const ok = diff != null && diff <= 1;
    await db().from("submissions").update({ score_check: { ok, expected: score, reported, diff, version } }).eq("id", id);
  } catch (e) {
    console.error("[content] score check failed", e);
  }
}

export async function scoreMismatches(limit = 20) {
  const { data } = await db().from("submissions")
    .select("id,email,assessment_key,score,score_check,submitted_at")
    .eq("score_check->>ok", "false").order("submitted_at", { ascending: false }).limit(limit);
  return data ?? [];
}
