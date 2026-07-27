// Thin server-function wrapper for the unified Hub dashboard.
// Module scope holds imports and server-fn declarations only.
import { createServerFn } from "@tanstack/react-start";

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { loadDashboard } = await import("@/lib/dashboard.server");
    return await loadDashboard();
  } catch {
    // Unauthenticated or unresolvable session -> let the route show sign-in.
    return null;
  }
});

