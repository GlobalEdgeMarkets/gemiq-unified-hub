/**
 * Which report a customer gets for one result. Shared by the customer
 * dashboard and Admin so both always open the same report.
 * - mode "hub": the Hub report page.
 * - mode "app": the IQ's own stored report link, else the Hub report page.
 * Lock state is NOT decided here; callers apply it.
 */
export const HUB_REPORT_BASE = "https://gemiq.globaledgemarkets.com/report/";

export function hubReportUrl(id: string): string {
  return `${HUB_REPORT_BASE}${id}`;
}

export function storedAppReportUrl(row: { metadata?: unknown; detail?: unknown }): string | null {
  for (const bag of [row.metadata, row.detail]) {
    if (bag && typeof bag === "object") {
      const rec = bag as Record<string, unknown>;
      const v = rec["report_url"] ?? rec["reportUrl"] ?? rec["result_url"];
      if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
    }
  }
  return null;
}

export function customerReportUrl(
  row: { id: string; metadata?: unknown; detail?: unknown },
  mode: string,
): string {
  if (mode === "hub") return hubReportUrl(row.id);
  return storedAppReportUrl(row) ?? hubReportUrl(row.id);
}
