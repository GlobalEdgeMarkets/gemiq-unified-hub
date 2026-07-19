/**
 * @gemiq/hub-sdk — client for GEM.IQ Hub, used from every IQ subdomain.
 *
 * Standard flow inside an IQ assessment:
 *
 *   import { createHubClient } from "@gemiq/hub-sdk";
 *   const hub = createHubClient({ hubOrigin: "https://gemiq.globaledgemarkets.com" });
 *
 *   const status = await hub.subscription.check();
 *   if (!status.authenticated) {
 *     window.location.href = hub.loginUrl(window.location.href);
 *     return;
 *   }
 *   if (!status.active) {
 *     await hub.subscription.startCheckout("gemiq_professional_monthly", {
 *       successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
 *       cancelUrl:  window.location.href,
 *     });
 *     return; // redirects to Stripe
 *   }
 *
 *   // ...run assessment...
 *   await hub.results.submit({
 *     email, assessment_key: "tariffiq", score, tier, dimensions,
 *     detail: { /* IQ-specific rich payload — mapped to HubSpot by the Hub */ },
 *   });
 */

export type AssessmentKey = string;

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
  /** IQ-specific rich payload. Stored verbatim and mapped to HubSpot by the Hub. */
  detail?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  submitted_at?: string;
}
export interface CheckStatus {
  authenticated: boolean;
  active: boolean;
  user?: HubUser;
  subscription: HubSubscription | null;
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
    /** Convenience: bounce the browser to the Hub sign-in page. */
    redirectToLogin(returnTo: string = typeof window !== "undefined" ? window.location.href : "/", mode: "signin" | "signup" = "signin") {
      if (typeof window === "undefined") throw new Error("redirectToLogin requires a browser");
      window.location.href = this.loginUrl(returnTo, mode);
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
      check: (): Promise<CheckStatus> =>
        req("/api/public/billing/check-subscription", { method: "GET" }),

      /**
       * Poll `check()` until the subscription flips to active. Use on the
       * IQ's /resume page after Stripe checkout returns — the webhook usually
       * lands within ~1s but can lag a few seconds.
       */
      waitUntilActive: async function (opts: { timeoutMs?: number; intervalMs?: number } = {}) {
        const timeout = opts.timeoutMs ?? 15_000;
        const interval = opts.intervalMs ?? 800;
        const started = Date.now();
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const s = await this.check();
          if (s.active) return s;
          if (Date.now() - started > timeout) return s;
          await new Promise(r => setTimeout(r, interval));
        }
      },

      /**
       * Create a Stripe checkout session and REDIRECT the browser to it.
       * `successUrl` / `cancelUrl` may include Stripe's `{CHECKOUT_SESSION_ID}`
       * placeholder for the IQ's /resume page.
       */
      startCheckout: async function (
        lookup_key: string,
        opts: { successUrl: string; cancelUrl: string },
      ) {
        const { url } = await req("/api/public/billing/create-checkout", {
          method: "POST",
          body: JSON.stringify({ lookup_key, success_url: opts.successUrl, cancel_url: opts.cancelUrl }),
        });
        if (typeof window === "undefined") return { url };
        window.location.href = url;
        return { url };
      },

      /** Legacy alias: returns the session { url, id } without redirecting. */
      createCheckout: (lookup_key: string, success_url: string, cancel_url: string) =>
        req("/api/public/billing/create-checkout", { method: "POST", body: JSON.stringify({ lookup_key, success_url, cancel_url }) }),

      /** Open Stripe customer portal (redirects). */
      openPortal: async function (return_url: string) {
        const { url } = await req("/api/public/billing/create-portal-session", {
          method: "POST",
          body: JSON.stringify({ return_url }),
        });
        if (typeof window !== "undefined") window.location.href = url;
        return { url };
      },
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
