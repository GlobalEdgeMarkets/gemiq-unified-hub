// HubSpot Contacts upsert via Lovable connector gateway.
// The Hub is the single writer. Property VALUES are computed by the registry
// (see src/lib/hub/assessments/index.ts::buildContactProperties).
// This file only owns transport + defensive filtering of unknown properties.
const GATEWAY = "https://connector-gateway.lovable.dev/hubspot";

function headers() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY!}`,
    "X-Connection-Api-Key": process.env.HUBSPOT_API_KEY!,
    "Content-Type": "application/json",
  };
}

export type HubSpotProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Upsert a contact by email. If HubSpot rejects individual gem_* properties
 * as unknown (e.g. bootstrap hasn't been run yet for a newly-added IQ field),
 * they are stripped from the payload and the call is retried — the contact
 * still lands, just missing those columns. Bootstrap fixes this permanently.
 */
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
  for (const m of errText.matchAll(/["']([a-z0-9_]+)["'][^"']*(?:does not exist|is not a known|invalid property)/gi)) {
    found.add(m[1]);
  }
  for (const m of errText.matchAll(/property\s+([a-z0-9_]+)\s+(?:does not exist|is not defined)/gi)) {
    found.add(m[1]);
  }
  return [...found];
}
