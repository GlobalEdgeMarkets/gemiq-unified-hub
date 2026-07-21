// Deferred, idempotent HubSpot property bootstrap.
// NOT called during initial build. Invoke manually with x-job-secret when ready.
// Creates: subscription fields, assessments-taken multi-checkbox, counts,
// high/low score fields, and any missing per-dimension gem_* properties.
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/hub/http";
import { collectAllPropertyDefs, REGISTRY } from "@/lib/hub/assessments";
import type { PropertyDef, PropertyType } from "@/lib/hub/assessments/types";

const GATEWAY = "https://connector-gateway.lovable.dev/hubspot";
function hsHeaders() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY!}`,
    "X-Connection-Api-Key": process.env.HUBSPOT_API_KEY!,
    "Content-Type": "application/json",
  };
}

type PropDef = {
  name: string; label: string; groupName: string; type: string; fieldType: string;
  description?: string; options?: { label: string; value: string }[];
};

const GROUP = "gemiq";

const PROPS: PropDef[] = [
  // Subscription fields
  { name: "gem_subscription_status", label: "GEM Subscription Status", groupName: GROUP, type: "enumeration", fieldType: "select",
    options: ["inactive","trialing","active","past_due","canceled","incomplete"].map(v => ({ label: v, value: v })) },
  { name: "gem_subscription_plan", label: "GEM Subscription Plan", groupName: GROUP, type: "string", fieldType: "text" },
  { name: "gem_subscription_renews_at", label: "GEM Subscription Renews At", groupName: GROUP, type: "date", fieldType: "date" },
  // Assessments taken (multi-checkbox)
  // Assessments taken (multi-checkbox) — auto-derived from registry
  { name: "gem_assessments_taken", label: "GEM Assessments Taken", groupName: GROUP, type: "enumeration", fieldType: "checkbox",
    options: REGISTRY.map(s => ({ label: s.displayName, value: s.key })) },
  { name: "gem_assessments_count", label: "GEM Assessments Count", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_high_score", label: "GEM Highest Score", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_low_score", label: "GEM Lowest Score", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_high_score_tool", label: "GEM Highest Score Tool", groupName: GROUP, type: "string", fieldType: "text" },
  { name: "gem_customer", label: "GEM Customer", groupName: GROUP, type: "bool", fieldType: "booleancheckbox",
    options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
  { name: "gem_last_assessment", label: "GEM Last Assessment", groupName: GROUP, type: "string", fieldType: "text" },
  { name: "gem_last_score", label: "GEM Last Score", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_last_tier", label: "GEM Last Tier", groupName: GROUP, type: "string", fieldType: "text" },
  { name: "gem_last_completed_at", label: "GEM Last Completed At", groupName: GROUP, type: "date", fieldType: "date" },
  // Shared score tier (5 tiers, lowercase values)
  { name: "gem_score_tier", label: "GEM Score Tier", groupName: GROUP, type: "enumeration", fieldType: "select",
    options: ["reactive","developing","defined","advanced","optimized"].map(v => ({ label: v[0].toUpperCase()+v.slice(1), value: v })) },
];

/** Map registry PropertyDef → HubSpot property create payload. */
function toHsPropDef(p: PropertyDef): PropDef {
  const map: Record<PropertyType, { type: string; fieldType: string }> = {
    string:     { type: "string",      fieldType: "text" },
    number:     { type: "number",      fieldType: "number" },
    date:       { type: "date",        fieldType: "date" },
    datetime:   { type: "datetime",    fieldType: "date" },
    bool:       { type: "bool",        fieldType: "booleancheckbox" },
    enum:       { type: "enumeration", fieldType: "select" },
    multi_enum: { type: "enumeration", fieldType: "checkbox" },
  };
  const t = map[p.type];
  return {
    name: p.name, label: p.label, groupName: GROUP,
    type: t.type, fieldType: t.fieldType,
    description: p.description,
    options: p.options,
  };
}

async function ensureGroup() {
  const res = await fetch(`${GATEWAY}/crm/v3/properties/contacts/groups`, {
    method: "POST", headers: hsHeaders(),
    body: JSON.stringify({ name: GROUP, label: "GEM.IQ", displayOrder: -1 }),
  });
  if (res.status === 409 || res.ok) return;
  const t = await res.text();
  if (!/already exists/i.test(t)) throw new Error(`group create failed [${res.status}]: ${t}`);
}

async function ensureProperty(p: PropDef) {
  const res = await fetch(`${GATEWAY}/crm/v3/properties/contacts`, {
    method: "POST", headers: hsHeaders(),
    body: JSON.stringify(p),
  });
  if (res.ok) return { name: p.name, status: "created" };
  const t = await res.text();
  const alreadyExists = res.status === 409 || /already exists/i.test(t);
  if (!alreadyExists) return { name: p.name, status: "error", error: t };

  // For enum properties, PATCH to sync options (label/options may have drifted).
  if (p.type === "enumeration" && p.options?.length) {
    const patch = await fetch(`${GATEWAY}/crm/v3/properties/contacts/${p.name}`, {
      method: "PATCH", headers: hsHeaders(),
      body: JSON.stringify({ label: p.label, options: p.options }),
    });
    if (patch.ok) return { name: p.name, status: "updated" };
    return { name: p.name, status: "update_error", error: await patch.text() };
  }
  return { name: p.name, status: "exists" };
}

export const Route = createFileRoute("/api/public/admin/bootstrap-hubspot-schema")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-job-secret");
        if (!secret || secret !== process.env.JOB_SECRET) return new Response("forbidden", { status: 403 });
        await ensureGroup();
        const results = [];
        for (const p of PROPS) results.push(await ensureProperty(p));
        // Also create every per-IQ property declared in the registry.
        for (const p of collectAllPropertyDefs()) results.push(await ensureProperty(toHsPropDef(p)));
        return json({ group: GROUP, results }, undefined, request);
      },
    },
  },
});
