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
    const res = await fetch(`${GATEWAY}/crm/v3/objects/contacts/batch/upsert`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        inputs: [{ idProperty: "email", id: email, properties: props }],
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

/**
 * Classify a submission as a Warm or Hot lead.
 * Rule (per product decision): every completion = Warm; Hot when score >= 80.
 */
export function classifyLead(score: number | null | undefined): "warm" | "hot" {
  return typeof score === "number" && score >= 80 ? "hot" : "warm";
}

/**
 * Create a HubSpot Lead associated to the given contact. Best-effort:
 * failures are logged and swallowed so the submission still succeeds.
 * Contact→Lead default association type id = 578 (HUBSPOT_DEFINED).
 */
export async function createLeadForContact(args: {
  contactId: string;
  contactName: string;
  assessmentLabel: string;
  score: number | null | undefined;
  temperature: "warm" | "hot";
}): Promise<{ id: string } | null> {
  const tempLabel = args.temperature === "hot" ? "Hot" : "Warm";
  const scoreStr = typeof args.score === "number" ? ` — Score ${args.score}` : "";
  const leadName = `${args.contactName} — ${args.assessmentLabel} (${tempLabel})${scoreStr}`;

  const body = {
    properties: {
      hs_lead_name: leadName,
      hs_lead_type: "NEW_BUSINESS",
      gem_lead_temperature: args.temperature,
      gem_lead_source_assessment: args.assessmentLabel,
    },
    associations: [
      {
        to: { id: args.contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 578 }],
      },
    ],
  };

  // Retry once with unknown props stripped (in case bootstrap hasn't run for gem_lead_* yet).
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${GATEWAY}/crm/v3/objects/leads`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      return { id: data.id };
    }
    const text = await res.text();
    const unknown = extractUnknownProps(text);
    if (unknown.length && attempt === 0) {
      for (const k of unknown) delete (body.properties as any)[k];
      continue;
    }
    console.error(`[hubspot] createLead failed [${res.status}]: ${text}`);
    return null;
  }
  return null;
}
