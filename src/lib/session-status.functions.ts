// Lightweight "who is signed in" check for the Hub header and sign-in page.
import { createServerFn } from "@tanstack/react-start";

export const getSessionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { createHubSupabaseSSR } = await import("@/lib/hub/supabase-server");
  const request = getRequest();
  if (!request?.headers?.get("cookie")) return { signedIn: false as const, email: null };
  const supabase = createHubSupabaseSSR(request, []);
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const email = data?.user?.email ?? null;
  return email ? { signedIn: true as const, email } : { signedIn: false as const, email: null };
});
