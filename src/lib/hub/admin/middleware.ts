import { createMiddleware } from "@tanstack/react-start";

function authError(message: string, statusCode: 401 | 403) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * Resolves the Hub session for admin server functions. Non-admin users continue
 * with isAdmin=false so the console can render the denied state; every
 * privileged handler rejects that context before acting.
 */
export const requireHubAdmin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { resolveHubAdmin } = await import("./resolve.server");
    const hubAdmin = await resolveHubAdmin();
    if (!hubAdmin) throw authError("Unauthorized", 401);
    return next({ context: { hubAdmin } });
  },
);
