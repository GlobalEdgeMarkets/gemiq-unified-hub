// Cross-subdomain CORS helpers for the Hub API.
// Browsers reject Access-Control-Allow-Origin: * when credentials mode is
// 'include' (the SDK always sends cookies). Echo the request's Origin when
// it's an allow-listed GEM.IQ subdomain, otherwise fall back to the Hub itself.

const ALLOWED_HOSTS = new Set([
  "gemiq.globaledgemarkets.com",
  "tariffiq.globaledgemarkets.com",
  "readinessiq.globaledgemarkets.com",
  "uxiq.globaledgemarkets.com",
  "techservicesiq.globaledgemarkets.com",
  "gtmiq.globaledgemarkets.com",
  "salesiq.globaledgemarkets.com",
  "productiq.globaledgemarkets.com",
  "aitransformiq.globaledgemarkets.com",
  "globaledgemarkets.com",
  "www.globaledgemarkets.com",
]);

function isAllowedOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (ALLOWED_HOSTS.has(u.hostname)) return true;
    // Allow Lovable preview/published subdomains for this project.
    if (u.hostname.endsWith(".lovable.app")) return true;
    return false;
  } catch {
    return false;
  }
}

function resolveOrigin(req?: Request): string {
  const origin = req?.headers.get("origin") ?? "";
  if (origin && isAllowedOrigin(origin)) return origin;
  return "https://gemiq.globaledgemarkets.com";
}

function corsHeaders(req?: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(req),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization,content-type,x-job-secret",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data: unknown, init: ResponseInit = {}, req?: Request) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...corsHeaders(req), ...(init.headers ?? {}) },
  });
}

const HUB_LOVABLE_HOSTS = new Set([
  "gemiq-unified-hub.lovable.app",
  "id-preview--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app",
  "project--d4b3f62b-5101-4b21-a476-4e0635e07df6.lovable.app",
  "project--d4b3f62b-5101-4b21-a476-4e0635e07df6-dev.lovable.app",
]);

/** Return/redirect URLs must point at a GEM.IQ site, never an arbitrary host. */
function isAllowedRedirect(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return u.protocol === "http:" || u.protocol === "https:";
    if (u.protocol !== "https:") return false;
    return ALLOWED_HOSTS.has(u.hostname)
      || u.hostname.endsWith(".globaledgemarkets.com")
      || HUB_LOVABLE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

export { json, corsHeaders, isAllowedRedirect };
