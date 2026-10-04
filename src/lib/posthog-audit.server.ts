// Admin-only PostHog activity audit: counts expected events per live IQ site
// over a date range (PostHog query API, read-only personal key), then asks the
// AI Gateway to explain which live-site events look missing or low.

export const AUDIT_SITES = {
  gemiq: "gemiq.globaledgemarkets.com",
  tariffiq: "tariffiq.globaledgemarkets.com",
  gtmiq: "gtmiq.globaledgemarkets.com",
  salesiq: "salesiq.globaledgemarkets.com",
  productiq: "productiq.globaledgemarkets.com",
  aitransformiq: "aitransformiq.globaledgemarkets.com",
  uxiq: "uxiq.globaledgemarkets.com",
} as const;
export type AuditSite = keyof typeof AUDIT_SITES;

const EXPECTED_EVENTS = [
  "$pageview",
  "$identify",
  "signup_completed",
  "signin_completed",
  "assessment_started",
  "assessment_submitted",
  "results_submitted",
  "checkout_started",
  "consultation_clicked",
];

export type AuditRow = { site: string; host: string; event: string; count: number };
export type AuditResult = {
  rows: AuditRow[];
  lastSeen: Record<string, string | null>;
  report: string;
};

async function queryPostHog(sql: string): Promise<unknown[][]> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) throw new Error("The read-only PostHog key hasn't been added yet.");
  const projectId = process.env.POSTHOG_PROJECT_ID ?? process.env.VITE_LOVABLE_CONNECTOR_POSTHOG_PROJECT_ID;
  if (!projectId) throw new Error("PostHog project is not configured.");
  const host = (process.env.POSTHOG_REGION ?? "us") === "us" ? "https://us.posthog.com" : "https://eu.posthog.com";
  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query: sql } }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[posthog-audit] query failed [${res.status}]: ${body}`);
    throw new Error(`PostHog refused the request [${res.status}]: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { results?: unknown[][] };
  return json.results ?? [];
}

async function analyze(input: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured for this project.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You audit analytics tracking for GEM.IQ, a hub site plus several assessment sites. " +
        "Given per-site event counts for a date range, write a short plain-language report for a non-technical owner. " +
        "List each selected site that sent nothing, then expected events that are missing or suspiciously low per site " +
        "(e.g. pageviews but no assessment_started, or assessment_submitted with no results_submitted). Suggest a concrete fix for each. " +
        "Note the hub (gemiq) does not run assessments, so assessment events are not expected there. Keep it under 300 words, use short bullet lists, no tables.",
      input,
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text();
    console.error(`[posthog-audit] AI failed [${res.status}]: ${body}`);
    if (res.status === 402) throw new Error("AI credits have run out. Add credits to the workspace and try again.");
    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a minute.");
    throw new Error(`AI analysis failed [${res.status}]: ${body.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const ev = JSON.parse(data);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
          if (ev.type === "response.failed" || ev.type === "error") {
            throw new Error(ev.response?.error?.message ?? ev.message ?? "AI analysis failed.");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
  return text.trim() || "The AI returned no report.";
}

export async function runPostHogAudit(opts: { from: string; to: string; sites: AuditSite[] }): Promise<AuditResult> {
  const hosts = opts.sites.map((s) => AUDIT_SITES[s]);
  const hostList = hosts.map((h) => `'${h}'`).join(",");
  const eventList = EXPECTED_EVENTS.map((e) => `'${e}'`).join(",");
  // Dates are zod-validated YYYY-MM-DD; hosts come from the fixed list above.
  const range = `timestamp >= toDateTime('${opts.from} 00:00:00') AND timestamp < toDateTime('${opts.to} 00:00:00') + INTERVAL 1 DAY`;

  const [counts, seen] = await Promise.all([
    queryPostHog(
      `SELECT properties.$host AS host, event, count() FROM events WHERE ${range} AND properties.$host IN (${hostList}) AND event IN (${eventList}) GROUP BY host, event`,
    ),
    queryPostHog(
      `SELECT properties.$host AS host, max(timestamp) FROM events WHERE ${range} AND properties.$host IN (${hostList}) GROUP BY host`,
    ),
  ]);

  const countMap = new Map(counts.map((r) => [`${r[0]}|${r[1]}`, Number(r[2])]));
  const rows: AuditRow[] = [];
  for (const site of opts.sites) {
    for (const event of EXPECTED_EVENTS) {
      rows.push({ site, host: AUDIT_SITES[site], event, count: countMap.get(`${AUDIT_SITES[site]}|${event}`) ?? 0 });
    }
  }
  const lastSeen: Record<string, string | null> = {};
  for (const site of opts.sites) {
    const hit = seen.find((r) => r[0] === AUDIT_SITES[site]);
    lastSeen[site] = hit ? String(hit[1]) : null;
  }

  const report = await analyze(
    `Date range: ${opts.from} to ${opts.to}\nLast event per site: ${JSON.stringify(lastSeen)}\nCounts (site, event, count):\n` +
      rows.map((r) => `${r.site}, ${r.event}, ${r.count}`).join("\n"),
  );
  return { rows, lastSeen, report };
}
