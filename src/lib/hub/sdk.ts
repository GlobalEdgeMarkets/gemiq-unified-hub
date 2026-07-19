/**
 * @gemiq/hub-sdk — client for GEM.IQ Hub
 *
 * Usage from an assessment subdomain:
 *   import { createHubClient } from "@gemiq/hub-sdk";
 *   const hub = createHubClient({ hubOrigin: "https://gemiq.globaledgemarkets.com" });
 *   const { active, user } = await hub.subscription.check();
 *   await hub.results.submit({ email, assessment_key: "tariffiq", score: 87, ... });
 */

export type AssessmentKey = "tariffiq" | "readinessiq" | "uxiq" | "techservicesiq";

export interface HubUser { id: string; email: string | null; }
export interface HubSubscription {
  status: string; lookup_key: string | null;
  current_period_end: string | null; cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null;
}
export interface SubmissionPayload {
  email: string;
  assessment_key: AssessmentKey;
  score?: number | null;
  tier?: string | null;
  dimensions?: Record<string, number | string | null>;
  answers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  submitted_at?: string;
}

export interface HubClientOptions {
  /** Origin of the GEM.IQ Hub, e.g. "https://gemiq.globaledgemarkets.com". */
  hubOrigin: string;
}

export function createHubClient(opts: HubClientOptions) {
  const base = opts.hubOrigin.replace(/\/$/, "");
  const req = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(base + path, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) throw Object.assign(new Error(body?.error ?? `HTTP ${res.status}`), { status: res.status, body });
    return body;
  };

  return {
    /** URL to send unauthenticated users to; returns to `returnTo` after auth. */
    loginUrl(returnTo: string, mode: "signin" | "signup" = "signin") {
      const u = new URL("/auth", base);
      u.searchParams.set("redirect", returnTo);
      u.searchParams.set("mode", mode);
      return u.toString();
    },
    auth: {
      signIn: (email: string, password: string) =>
        req("/api/public/auth/session", { method: "POST", body: JSON.stringify({ action: "signin", email, password }) }),
      signUp: (email: string, password: string, metadata?: Record<string, unknown>) =>
        req("/api/public/auth/session", { method: "POST", body: JSON.stringify({ action: "signup", email, password, metadata }) }),
      signOut: () => req("/api/public/auth/session", { method: "POST", body: JSON.stringify({ action: "signout" }) }),
    },
    subscription: {
      /** Session + active subscription status. */
      check: (): Promise<{ authenticated: boolean; active: boolean; user?: HubUser; subscription: HubSubscription | null }> =>
        req("/api/public/billing/check-subscription", { method: "GET" }),
      createCheckout: (lookup_key: string, success_url: string, cancel_url: string) =>
        req("/api/public/billing/create-checkout", { method: "POST", body: JSON.stringify({ lookup_key, success_url, cancel_url }) }),
      openPortal: (return_url: string) =>
        req("/api/public/billing/create-portal-session", { method: "POST", body: JSON.stringify({ return_url }) }),
    },
    results: {
      submit: (payload: SubmissionPayload) =>
        req("/api/public/submissions/submit", { method: "POST", body: JSON.stringify(payload) }),
      /** Signed-in user's submission history. */
      history: async () => {
        const r = await req("/api/public/submissions/history", { method: "GET" }).catch(() => ({ submissions: [] }));
        return r;
      },
    },
  };
}
