// HubSpot transport: one place that decides how the Hub reaches HubSpot.
// If HUBSPOT_SERVICE_KEY (a pat- service key) is set, call HubSpot directly;
// otherwise fall back to the Lovable connector gateway.
export function hsBase(): string {
  return process.env.HUBSPOT_SERVICE_KEY
    ? "https://api.hubapi.com"
    : "https://connector-gateway.lovable.dev/hubspot";
}

export function hsAuthHeaders(): Record<string, string> {
  const key = process.env.HUBSPOT_SERVICE_KEY;
  if (key) return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY!}`,
    "X-Connection-Api-Key": process.env.HUBSPOT_API_KEY!,
    "Content-Type": "application/json",
  };
}
