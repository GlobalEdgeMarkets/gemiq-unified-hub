import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHubSupabaseSSR } from "@/lib/hub/supabase-server";
import { assertAdmin } from "./guard.server";

function authError(message: string, statusCode: 401 | 403) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * Resolves the Hub's HttpOnly cookie session for admin server functions.
 * Non-admin users continue with isAdmin=false so adminWhoami can render the
 * denied state; every privileged handler rejects that context before acting.
 */
/**
 * Resolves the current Hub user (cookie session first, bearer token fallback)
 * without throwing. Returns null for anonymous requests.
 */
export async function resolveHubAdmin(): Promise<
  { userId: string; email: string | null; isAdmin: boolean } | null
> {
  const request = getRequest();
  if (!request?.headers) return null;

  const supabase = createHubSupabaseSSR(request, []);

  // 1) Hub HttpOnly cookie session (production, cross-subdomain).
  let { data, error } = await supabase.auth.getUser();

  // 2) Fallback: Authorization bearer attached by the client middleware.
  //    The preview iframe has no Hub cookie, so cookie-only auth fails there.
  if (error || !data.user) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token) ({ data, error } = await supabase.auth.getUser(token));
  }

  const user = data?.user;
  if (error || !user) return null;

  const email = user.email ?? null;
  let isAdmin = false;
  try {
    assertAdmin({ email });
    isAdmin = true;
  } catch {
    // Signed in, but not an admin.
  }
  return { userId: user.id, email, isAdmin };
}

export const requireHubAdmin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const hubAdmin = await resolveHubAdmin();
    if (!hubAdmin) throw authError("Unauthorized", 401);
    return next({ context: { hubAdmin } });
  },
);