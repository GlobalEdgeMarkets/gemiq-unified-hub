import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { hubCookieDomain, HUB_COOKIE_BASE } from "./cookies";

type CookieBag = { name: string; value: string; options?: CookieOptions };

export function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(";").map((c) => {
    const [n, ...v] = c.trim().split("=");
    return { name: n, value: decodeURIComponent(v.join("=") ?? "") };
  });
}

export function serializeCookie(c: CookieBag, host?: string | null): string {
  const opts = c.options ?? {};
  const domain = opts.domain ?? hubCookieDomain(host);
  const parts = [`${c.name}=${encodeURIComponent(c.value)}`];
  parts.push(`Path=${opts.path ?? HUB_COOKIE_BASE.path}`);
  if (domain) parts.push(`Domain=${domain}`);
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${new Date(opts.expires).toUTCString()}`);
  parts.push(`SameSite=${(opts.sameSite as string) ?? HUB_COOKIE_BASE.sameSite}`);
  if (opts.httpOnly ?? HUB_COOKIE_BASE.httpOnly) parts.push("HttpOnly");
  if (opts.secure ?? HUB_COOKIE_BASE.secure) parts.push("Secure");
  return parts.join("; ");
}

/** SSR Supabase client that reads request cookies and appends Set-Cookie to a shared array. */
export function createHubSupabaseSSR(request: Request, setCookies: string[]) {
  const host = request.headers.get("host");
  const jar = parseCookieHeader(request.headers.get("cookie"));
  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar,
        setAll: (cookies) => {
          for (const c of cookies) setCookies.push(serializeCookie(c, host));
        },
      },
    },
  );
}

/** Service-role client for privileged writes (webhooks, worker). */
export function createHubServiceClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Anon-key client acting as the caller (bearer token). RLS applies exactly as
 * it does in the browser — never swap this for a service-role client.
 */
export function createHubUserClient(accessToken: string) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/**
 * The one subscription read for a user.
 *
 * `subscriptions` has no unique constraint on `user_id` (only on
 * `stripe_subscription_id`), so a cancel-and-resubscribe can leave a user with
 * more than one row. Plain `.maybeSingle()` throws PGRST116 in that case, and
 * plain recency can rank a recently-touched cancelled row above a live one.
 *
 * Precedence mirrors `reconcileSubscriptionForUser`: prefer an active/trialing
 * row, otherwise the most recently updated one. Callers pass their own columns
 * (must include `status`); the helper owns ordering and the single-row pick.
 */
export async function selectCurrentSubscription<Row extends { status?: string | null }>(
  client: { from: (table: "subscriptions") => any },
  userId: string,
  columns: string,
): Promise<{ data: Row | null; error: { message: string } | null }> {
  const { data, error } = await client
    .from("subscriptions")
    .select(columns)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) return { data: null, error };
  const rows = (data ?? []) as Row[];
  const live = rows.find((r) => r.status === "active" || r.status === "trialing");
  return { data: live ?? rows[0] ?? null, error: null };
}

