// Deferred, idempotent HubSpot property bootstrap.
// NOT called during initial build. Invoke manually with x-job-secret when ready.
// Creates: subscription fields, assessments-taken multi-checkbox, counts,
// high/low score fields, and any missing per-dimension gem_* properties.
import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/hub/http";

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
  { name: "gem_assessments_taken", label: "GEM Assessments Taken", groupName: GROUP, type: "enumeration", fieldType: "checkbox",
    options: [
      { label: "TariffIQ", value: "tariffiq" },
      { label: "ReadinessIQ", value: "readinessiq" },
      { label: "UXIQ", value: "uxiq" },
      { label: "TechServicesIQ", value: "techservicesiq" },
    ] },
  { name: "gem_assessments_count", label: "GEM Assessments Count", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_high_score", label: "GEM Highest Score", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_low_score", label: "GEM Lowest Score", groupName: GROUP, type: "number", fieldType: "number" },
  { name: "gem_high_score_tool", label: "GEM Highest Score Tool", groupName: GROUP, type: "string", fieldType: "text" },
];

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
  if (res.ok || res.status === 409) return { name: p.name, status: "ok" };
  const t = await res.text();
  if (/already exists/i.test(t)) return { name: p.name, status: "exists" };
  return { name: p.name, status: "error", error: t };
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
        return json({ group: GROUP, results });
      },
    },
  },
});
