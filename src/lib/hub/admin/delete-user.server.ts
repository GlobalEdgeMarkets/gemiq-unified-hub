// Full user deletion: IQ purge endpoints → HubSpot contact → Stripe customer → Hub records → auth account.
// Each step is reported separately; one failing step never hides the others.
import { createHubServiceClient } from "@/lib/hub/supabase-server";

/** IQ apps exposing a purge endpoint. Add an entry when another IQ ships one. */
const IQ_PURGE_ENDPOINTS: { key: string; url: string }[] = [
  { key: "tariffiq", url: "https://pltvcqnknmukgpsipmec.supabase.co/functions/v1/purge-user" },
  { key: "salesiq", url: "https://salesiq.globaledgemarkets.com/api/public/purge-user" },
  { key: "gtmiq", url: "https://gtmiq.globaledgemarkets.com/api/public/purge-user" },
  { key: "productiq", url: "https://productiq.globaledgemarkets.com/api/public/purge-user" },
  { key: "aitransformiq", url: "https://aitransformiq.globaledgemarkets.com/api/public/purge-user" },
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
  const { hsBase, hsAuthHeaders } = await import("@/lib/hub/hubspot-transport");
  const GATEWAY = hsBase();
  const headers = hsAuthHeaders();
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

  // 3. Hub records (needed below to find Stripe customer ids too)
  const db = createHubServiceClient();
  const { data: profiles } = await db.from("profiles").select("id").ilike("email", email);
  const ids = (profiles ?? []).map((p) => p.id);

  // 4. Stripe — delete every customer for this email (Stripe cancels their
  // subscriptions immediately). Payment history stays in Stripe's records.
  try {
    const { stripe } = await import("@/lib/hub/stripe");
    const customerIds = new Set<string>();
    const found = await stripe().customers.list({ email, limit: 100 });
    found.data.forEach((c) => customerIds.add(c.id));
    if (ids.length) {
      const { data: subs } = await db.from("subscriptions").select("stripe_customer_id").in("user_id", ids);
      (subs ?? []).forEach((s) => s.stripe_customer_id && customerIds.add(s.stripe_customer_id));
    }
    for (const id of customerIds) {
      try { await stripe().customers.del(id); }
      catch (e) { if ((e as { code?: string }).code !== "resource_missing") throw e; }
    }
    steps.push({ step: "stripe customer", ok: true, detail: customerIds.size ? `deleted ${customerIds.size} customer(s), subscriptions cancelled` : "no customer" });
  } catch (e) {
    console.error("[delete-user] stripe", e);
    steps.push({ step: "stripe customer", ok: false, detail: "Stripe request failed" });
  }

  const run = async (step: string, fn: () => PromiseLike<{ error: unknown }>) => {
    const { error } = await fn();
    if (error) console.error(`[delete-user] ${step}`, error);
    steps.push({ step, ok: !error, detail: error ? "database error" : undefined });
  };
  const { data: subRows } = await db.from("submissions").select("id").ilike("email", email);
  const subIds = (subRows ?? []).map((s) => s.id);
  if (subIds.length) await run("retry queue", () => db.from("retry_queue").delete().in("submission_id", subIds));
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
