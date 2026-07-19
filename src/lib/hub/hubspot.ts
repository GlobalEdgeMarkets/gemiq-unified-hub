// HubSpot Contacts upsert via Lovable connector gateway.
// Writes ONLY to existing gem_* properties — silently skips any HubSpot returns as missing.
const GATEWAY = "https://connector-gateway.lovable.dev/hubspot";

function headers() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY!}`,
    "X-Connection-Api-Key": process.env.HUBSPOT_API_KEY!,
    "Content-Type": "application/json",
  };
}

export type HubSpotProps = Record<string, string | number | boolean | null | undefined>;

/** Build gem_* property map from a submission. */
export function buildGemProperties(input: {
  email: string;
  assessment_key: string;
  score?: number | null;
  tier?: string | null;
  dimensions?: Record<string, number | string | null> | null;
  submitted_at?: string;
  metadata?: Record<string, any> | null;
}): HubSpotProps {
  const p: HubSpotProps = {
    email: input.email,
    gem_assessment_tool: input.assessment_key,
    gem_assessment_date: (input.submitted_at ?? new Date().toISOString()).slice(0, 10),
  };
  if (input.score != null) p.gem_assessment_score = input.score;
  if (input.tier) p.gem_score_tier = input.tier;
  // Dimension scores flattened as gem_<assessment>_<dim>
  const prefix = input.assessment_key.replace(/iq$/i, ""); // tariff, readiness, ux, techservices
  if (input.dimensions) {
    for (const [k, v] of Object.entries(input.dimensions)) {
      if (v == null) continue;
      const key = `gem_${prefix}_${k}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      p[key] = v as any;
    }
  }
  if (input.metadata?.company) p.company = input.metadata.company;
  if (input.metadata?.first_name) p.firstname = input.metadata.first_name;
  if (input.metadata?.last_name) p.lastname = input.metadata.last_name;
  return p;
}

/** Filter out properties that HubSpot rejected as unknown; retries once. */
export async function upsertContactByEmail(
  email: string,
  properties: HubSpotProps,
): Promise<{ id: string; skipped: string[] }> {
  const skipped: string[] = [];
  let attempt = 0;
  let props = { ...properties };
  while (attempt < 4) {
    attempt++;
    const res = await fetch(`${GATEWAY}/crm/v3/objects/contacts/upsert`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        idProperty: "email",
        inputs: [{ id: email, properties: props }],
      }),
    });
    if (res.ok) {
      const body = await res.json();
      const id = body.results?.[0]?.id;
      if (!id) throw new Error(`HubSpot upsert: missing id in response`);
      return { id, skipped };
    }
    const text = await res.text();
    // Try to detect "Property values were not valid" / unknown property errors
    const unknownProps = extractUnknownProps(text);
    if (unknownProps.length && attempt < 4) {
      for (const k of unknownProps) {
        skipped.push(k);
        delete props[k];
      }
      continue;
    }
    throw new Error(`HubSpot upsert failed [${res.status}]: ${text}`);
  }
  throw new Error("HubSpot upsert: exhausted retries");
}

function extractUnknownProps(errText: string): string[] {
  const found = new Set<string>();
  // Common HubSpot error shape: "Property \"gem_xyz\" does not exist"
  for (const m of errText.matchAll(/["']([a-z0-9_]+)["'][^"']*(?:does not exist|is not a known|invalid property)/gi)) {
    found.add(m[1]);
  }
  for (const m of errText.matchAll(/property\s+([a-z0-9_]+)\s+(?:does not exist|is not defined)/gi)) {
    found.add(m[1]);
  }
  return [...found];
}
