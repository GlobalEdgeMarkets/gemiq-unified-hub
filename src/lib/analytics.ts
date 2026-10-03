// Browser-side PostHog. Loaded lazily after hydration so SSR never touches it.
// Cookie is shared across *.globaledgemarkets.com so visits to the Hub and the
// IQ apps that use the same PostHog project join into one journey.
import type { PostHog } from "posthog-js";

let ph: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;

export function initAnalytics(): Promise<PostHog | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (ph) return Promise.resolve(ph);
  if (loading) return loading;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
  if (!key) return Promise.resolve(null);
  const region = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string | undefined;
  loading = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com",
        capture_pageview: "history_change",
        cross_subdomain_cookie: true,
        person_profiles: "identified_only",
      });
      posthog.register({ app: "gemiq_hub" });
      ph = posthog;
      return posthog;
    })
    .catch(() => null);
  return loading;
}

export function track(event: string, properties: Record<string, unknown> = {}) {
  void initAnalytics().then((p) => p?.capture(event, properties));
}

/** Tie this browser to the Hub user so server-side events (checkout, Stripe, HubSpot) join up. */
export function identifyUser(userId: string, traits: Record<string, unknown> = {}) {
  void initAnalytics().then((p) => p?.identify(userId, traits));
}
