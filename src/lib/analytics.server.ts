// Server-side PostHog capture. Never throws and never blocks longer than ~1.5s:
// analytics must not break checkout, the Stripe webhook, or IQ submissions.
// distinct_id is the Hub user id when known (matches the browser identify),
// otherwise the lowercased email.
type Props = Record<string, unknown>;

export async function captureServer(
  event: string,
  distinctId: string | null | undefined,
  properties: Props = {},
): Promise<void> {
  try {
    const key = process.env.POSTHOG_API_KEY;
    if (!key || !distinctId) return;
    const host = process.env.POSTHOG_REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
    const res = await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: "gemiq-hub-server", app: "gemiq_hub" },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) console.error(`[posthog] capture ${event} failed [${res.status}]: ${await res.text()}`);
  } catch (e) {
    console.error(`[posthog] capture ${event} error`, e);
  }
}

/** Which IQ app (or the Hub) a cross-site request came from, from Origin/Referer. */
export function sourceFromRequest(request: Request): string {
  const raw = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  try {
    return new URL(raw).hostname.toLowerCase().split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}
