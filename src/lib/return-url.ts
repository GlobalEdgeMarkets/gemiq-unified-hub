// One return-address rule for the whole sign-up / sign-in journey (client-safe, pure).
// Allowed: https only, host = a non-retired IQ app's site_url (app registry) or a Hub host.
// Anything else returns null and callers fall back to the dashboard.

/** The Hub's own addresses (primary + other domains that serve this same Hub). */
export const HUB_HOSTS = ["gemiq.globaledgemarkets.com", "readinessiq.globaledgemarkets.com", "gemiq-unified-hub.lovable.app"];

export interface RegistryApp { site_url: string | null; lifecycle: string }

export function allowedReturnHosts(apps: RegistryApp[], extraHubHosts: string[] = []): string[] {
  const iq = apps
    .filter((a) => a.lifecycle !== "retired" && a.site_url)
    .map((a) => { try { return new URL(a.site_url!).hostname.toLowerCase(); } catch { return ""; } })
    .filter(Boolean);
  return [...new Set([...iq, ...HUB_HOSTS, ...extraHubHosts.map((h) => h.toLowerCase())])];
}

export function checkReturnUrl(raw: unknown, allowedHosts: string[]): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return allowedHosts.includes(u.hostname.toLowerCase()) ? u.toString() : null;
  } catch { return null; }
}

/** Checkout success/cancel addresses: registered IQ sites + Hub hosts (same rule), plus local dev. */
export function isCheckoutAddressAllowed(raw: unknown, allowedHosts: string[]): boolean {
  if (checkReturnUrl(raw, allowedHosts)) return true;
  try { const h = new URL(String(raw)).hostname; return h === "localhost" || h === "127.0.0.1"; } catch { return false; }
}
