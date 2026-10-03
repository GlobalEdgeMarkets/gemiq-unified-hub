// Full user deletion: IQ purge endpoints → HubSpot contact → Hub records → auth account.
// Each step is reported separately; one failing step never hides the others.
import { createHubServiceClient } from "@/lib/hub/supabase-server";

/** IQ apps exposing a purge endpoint. Add an entry when another IQ ships one. */
const IQ_PURGE_ENDPOINTS: { key: string; url: string }[] = [
  { key: "tariffiq", url: "https://pltvcqnknmukgpsipmec.supabase.co/functions/v1/purge-user" },
];

type Step = { step: string; ok: boolean; detail?: string };

async function purgeIq(url: string, email: string, secret: string): Promise<Step["detail"] | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-purge-secret": secret },
    body: JSON.stringify({ email }),
  });
  if (res.ok) return null;
  const body = (await res.text()).slice(0, 300);
  console.error(`[delete-user] purge ${url} failed [${res.status}]: ${body}`);
  return `HTTP ${res.status}`;
}

async function deleteHubspotContact(email: string): Promise<string> {
  const GATEWAY = "https://connector-gateway.lovable.dev/hubspot";
  const headers = {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY!}`,
    "X-Connection-Api-Key": process.env.HUBSPOT_API_KEY!,
  };
  const get = await fetch(
    `${GATEWAY}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=email`,
    { headers },
  );
  if (get.status === 404) return "no contact";
  if (!get.ok) throw new Error(`lookup HTTP ${get.status}: ${(await get.text()).slice(0, 200)}`);
  const { id } = (await get.json()) as { id: string };
  const del = await fetch(`${GATEWAY}/crm/v3/objects/contacts/${id}`, { method: "DELETE", headers });
  if (!del.ok && del.status !== 404) throw new Error(`delete HTTP ${del.status}: ${(await del.text()).slice(0, 200)}`);
  return `deleted contact ${id}`;
}

export async function runDeleteUser(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const steps: Step[] = [];

  // 1. IQ apps
  const secret = process.env.HUB_PURGE_SECRET;
  for (const iq of IQ_PURGE_ENDPOINTS) {
    if (!secret) { steps.push({ step: `purge ${iq.key}`, ok: false, detail: "HUB_PURGE_SECRET not set" }); continue; }
    try {
      const err = await purgeIq(iq.url, email, secret);
      steps.push({ step: `purge ${iq.key}`, ok: !err, detail: err ?? undefined });
    } catch (e) {
      console.error(`[delete-user] purge ${iq.key} threw`, e);
      steps.push({ step: `purge ${iq.key}`, ok: false, detail: "request failed" });
    }
  }

  // 2. HubSpot
  try {
    steps.push({ step: "hubspot contact", ok: true, detail: await deleteHubspotContact(email) });
  } catch (e) {
    console.error("[delete-user] hubspot", e);
    steps.push({ step: "hubspot contact", ok: false, detail: (e as Error).message });
  }

  // 3. Hub records + auth account
  const db = createHubServiceClient();
  const { data: profiles } = await db.from("profiles").select("id").ilike("email", email);
  const ids = (profiles ?? []).map((p) => p.id);

  const run = async (step: string, fn: () => PromiseLike<{ error: unknown }>) => {
    const { error } = await fn();
    if (error) console.error(`[delete-user] ${step}`, error);
    steps.push({ step, ok: !error, detail: error ? "database error" : undefined });
  };
  await run("submissions", () => db.from("submissions").delete().ilike("email", email));
  await run("credits", () => db.from("assessment_credits").delete().ilike("email", email));
  if (ids.length) {
    await run("subscriptions", () => db.from("subscriptions").delete().in("user_id", ids));
    await run("profiles", () => db.from("profiles").delete().in("id", ids));
    for (const id of ids) {
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) console.error("[delete-user] auth", error);
      steps.push({ step: "auth account", ok: !error, detail: error ? error.message : undefined });
    }
  } else {
    steps.push({ step: "auth account", ok: true, detail: "no Hub account for this email" });
  }

  return { email, ok: steps.every((s) => s.ok), steps };
}
