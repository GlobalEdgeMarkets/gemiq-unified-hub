// Cookie helper: cross-subdomain in prod, host-only in preview/localhost.
export function hubCookieDomain(reqHost?: string | null): string | undefined {
  const configured = process.env.HUB_COOKIE_DOMAIN;
  if (!configured) return undefined;
  const bare = configured.replace(/^\./, "");
  const host = (reqHost ?? "").split(":")[0].toLowerCase();
  if (!host) return undefined;
  if (host === bare || host.endsWith("." + bare)) return configured;
  return undefined; // localhost / *.lovable.app → host-only fallback
}

export const HUB_COOKIE_BASE = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: true,
  secure: true,
};
