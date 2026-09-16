// Thin server-function wrapper for the unified Hub dashboard.
// Module scope holds imports and server-fn declarations only.
import { createServerFn } from "@tanstack/react-start";

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { loadDashboard } = await import("@/lib/dashboard.server");
  // `null` means "no signed-in user" and only that. Any other failure throws so
  // the route renders an error state instead of a false sign-in prompt.
  return await loadDashboard();
});
