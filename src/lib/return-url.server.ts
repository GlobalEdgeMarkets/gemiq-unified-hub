import { getRequest } from "@tanstack/react-start/server";
import { allowedReturnHosts, checkReturnUrl } from "./return-url";

/** Allowed hosts right now: non-retired registry apps + Hub hosts + the current Hub host. */
export async function currentAllowedHosts(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("hub_iq_apps").select("site_url,lifecycle");
  const host = (() => { try { return new URL(getRequest().url).hostname; } catch { return ""; } })();
  return allowedReturnHosts((data ?? []) as { site_url: string | null; lifecycle: string }[], host ? [host] : []);
}

/** Checks a return address against non-retired registry apps plus the Hub's own hosts. */
export async function safeReturnUrl(raw: unknown): Promise<string | null> {
  if (typeof raw !== "string" || !raw) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("hub_iq_apps").select("site_url,lifecycle");
  const host = (() => { try { return new URL(getRequest().url).hostname; } catch { return ""; } })();
  return checkReturnUrl(raw, allowedReturnHosts((data ?? []) as { site_url: string | null; lifecycle: string }[], host ? [host] : []));
}
