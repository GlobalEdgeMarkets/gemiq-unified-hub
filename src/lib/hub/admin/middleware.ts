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
export const requireHubAdmin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw authError("Unauthorized", 401);

    const supabase = createHubSupabaseSSR(request, []);
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user) throw authError("Unauthorized", 401);

    const email = user.email ?? null;
    let isAdmin = false;
    try {
      assertAdmin({ email });
      isAdmin = true;
    } catch {
      // adminWhoami needs to distinguish a signed-in, non-admin user.
    }

    return next({
      context: {
        hubAdmin: { userId: user.id, email, isAdmin },
      },
    });
  },
);