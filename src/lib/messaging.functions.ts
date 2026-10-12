// Public read of published GEM.IQ messaging for the Hub's own pages (Approved only).
import { createServerFn } from "@tanstack/react-start";

export const getGemiqMessaging = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { publishedVersion } = await import("@/lib/hub/messaging.server");
    const { publicPayload } = await import("@/lib/messaging");
    const live = await publishedVersion();
    if (!live) return null;
    return publicPayload(live.body, "gemiq", live.version, live.published_at).by_key as Record<string, string>;
  } catch (e) {
    console.error("[messaging] read failed, using built-in wording", e);
    return null;
  }
});
