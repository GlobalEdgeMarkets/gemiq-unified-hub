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
 *     detail: { /* IQ-specific rich payload — mapped to HubSpot by the Hub *\/ },
 *   });
 */

export type AssessmentKey = string;

export interface HubUser { id: string; email: string | null; }
export interface HubSubscription {
  status: string; lookup_key: string | null;
  current_period_end: string | null; cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null;
  trial_ends_at?: string | null;
  trial_assessments_used?: number | null;
  trial_assessment_limit?: number | null;
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
  /** Public URL to a rendered PDF/HTML report. Shown in the internal notification email. */
  report_url?: string;
  submitted_at?: string;
}
export interface CheckStatus {
  authenticated: boolean;
  active: boolean;
  /** True when Stripe reports `trialing` — still counts as `active`. */
  trialing?: boolean;
  /** True when the trial's free-assessment quota has been consumed. */
  trial_exhausted?: boolean;
  user?: HubUser;
  subscription: HubSubscription | null;
}

export interface HubProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  title: string | null;
  role: string | null;
  industry: string | null;
}
export type HubProfilePatch = Partial<Omit<HubProfile, "id" | "email" | "full_name">>;

/**
 * Canonical manifest published by the Hub at `/api/public/manifest`.
 * Every IQ should treat this as the source of truth for brand, pricing,
 * assessment routing, and deep links — no hard-coded copies.
 */
export interface HubManifest {
  version: string;
  etag?: string;
  served_at?: string;
  hub: {
    origin: string;
    docs_url: string;
    sdk_source: string;
    manifest_source: string;
    repo: string;
  };
  brand: {
    name: string;
    fonts: { heading: string; body: string };
    colors: Record<string, string>;
    logos: Record<string, string>;
    usage_rules: string[];
  };
  pricing: {
    currency: string;
    trial: { days: number; assessments_included: number; card_required: boolean };
    plans: Array<{
      id: string;
      name: string;
      amount: number;
      interval: "month" | "year";
      lookup_key: string;
    }>;
  };
  assessments: Array<{ key: AssessmentKey; name: string; url: string }>;
  deep_links: Record<string, string>;
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
       *
       * Pass `trial: true` to start a 7-day trial (card required, 1 free
       * assessment across any IQ, auto-converts to paid on day 7).
       */
      startCheckout: async function (
        lookup_key: string,
        opts: { successUrl: string; cancelUrl: string; trial?: boolean },
      ) {
        const { url } = await req("/api/public/billing/create-checkout", {
          method: "POST",
          body: JSON.stringify({
            lookup_key,
            success_url: opts.successUrl,
            cancel_url: opts.cancelUrl,
            ...(opts.trial ? { trial: true } : {}),
          }),
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
    profile: {
      /** Fetch the signed-in user's Hub profile (prefill IQ forms with this). */
      get: (): Promise<{ profile: HubProfile | null; error?: string }> =>
        req("/api/public/profile", { method: "GET" }).catch(() => ({ profile: null })),
      /** Persist edits to the Hub profile (call this after an IQ collects new fields). */
      update: (patch: HubProfilePatch): Promise<{ profile: HubProfile }> =>
        req("/api/public/profile", { method: "PATCH", body: JSON.stringify(patch) }),
    },
    results: {
      submit: (payload: SubmissionPayload) =>
        req("/api/public/submissions/submit", { method: "POST", body: JSON.stringify(payload) }),
      /** Signed-in user's submission history. */
      history: async () => {
        const r = await req("/api/public/submissions/history", { method: "GET" }).catch(() => ({ submissions: [] }));
        return r;
      },
      /**
       * Submit results and, if the trial's free-assessment quota is exhausted,
       * automatically redirect the user into Stripe checkout to upgrade —
       * no custom try/catch required in the IQ app.
       *
       * Returns the Hub's submission response on success, or `{ upgraded: true }`
       * if the browser was redirected to Stripe. Any other error rethrows.
       *
       * Example:
       *   const r = await hub.results.submitOrUpgrade(payload, {
       *     upgradeLookupKey: "gemiq_professional_monthly",
       *     successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
       *     cancelUrl:  window.location.href,
       *   });
       *   if ("upgraded" in r) return; // browser is navigating away
       */
      submitOrUpgrade: async function (
        payload: SubmissionPayload,
        opts: {
          upgradeLookupKey?: string;
          successUrl: string;
          cancelUrl: string;
          /** Called just before redirecting so the IQ can show a toast/modal. */
          onTrialExhausted?: () => void | Promise<void>;
        },
      ): Promise<{ upgraded: true } | Awaited<ReturnType<typeof req>>> {
        try {
          return await req("/api/public/submissions/submit", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } catch (e) {
          if (!isTrialLimitError(e)) throw e;
          if (opts.onTrialExhausted) await opts.onTrialExhausted();
          const { url } = await req("/api/public/billing/create-checkout", {
            method: "POST",
            body: JSON.stringify({
              lookup_key: opts.upgradeLookupKey ?? "gemiq_professional_monthly",
              success_url: opts.successUrl,
              cancel_url: opts.cancelUrl,
            }),
          });
          if (typeof window !== "undefined") window.location.href = url;
          return { upgraded: true };
        }
      },
    },

    /**
     * Centralized manifest: brand tokens, pricing, deep links, assessment
     * registry, and SDK version. IQs should poll this on boot and on a
     * schedule (default 5 min) to stay in sync — never hard-code brand or
     * pricing values locally.
     */
    manifest: {
      /** Fetch the current manifest. Uses `If-None-Match` when `etag` is supplied. */
      get: async (opts: { etag?: string } = {}): Promise<{ manifest: HubManifest | null; etag: string | null; notModified: boolean }> => {
        const res = await fetch(base + "/api/public/manifest", {
          method: "GET",
          headers: opts.etag ? { "if-none-match": opts.etag } : {},
        });
        if (res.status === 304) return { manifest: null, etag: opts.etag ?? null, notModified: true };
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        const manifest = (await res.json()) as HubManifest;
        return { manifest, etag: res.headers.get("etag"), notModified: false };
      },

      /**
       * Poll the manifest on an interval. Calls `onChange` only when the
       * `etag` (or `version`) changes. Returns a stop() function.
       *
       *   const stop = hub.manifest.watch(
       *     { intervalMs: 5 * 60_000 },
       *     (next, prev) => applyBrandTokens(next),
       *   );
       */
      watch: function (
        opts: { intervalMs?: number; immediate?: boolean } = {},
        onChange: (next: HubManifest, previous: HubManifest | null) => void | Promise<void>,
      ): () => void {
        const interval = Math.max(30_000, opts.intervalMs ?? 5 * 60_000);
        let etag: string | undefined;
        let previous: HubManifest | null = null;
        let stopped = false;

        const tick = async () => {
          if (stopped) return;
          try {
            const { manifest, etag: nextEtag, notModified } = await this.get({ etag });
            if (!notModified && manifest) {
              const changed = !previous || previous.version !== manifest.version || etag !== (nextEtag ?? undefined);
              etag = nextEtag ?? undefined;
              if (changed) {
                await onChange(manifest, previous);
                previous = manifest;
              }
            }
          } catch {
            /* swallow poll errors — try again next interval */
          }
        };

        if (opts.immediate !== false) void tick();
        const handle = typeof window !== "undefined" ? window.setInterval(tick, interval) : setInterval(tick, interval);
        return () => { stopped = true; clearInterval(handle as ReturnType<typeof setInterval>); };
      },
    },

  };
}

/**
 * Type guard for the 402 `trial_limit_reached` error thrown by `results.submit`.
 * Use directly, or call `results.submitOrUpgrade` to handle the upgrade automatically.
 */
export function isTrialLimitError(e: unknown): e is Error & {
  status: 402;
  body: { error: "trial_limit_reached"; [k: string]: unknown };
} {
  const err = e as { status?: number; body?: { error?: string } } | null | undefined;
  return !!err && err.status === 402 && err.body?.error === "trial_limit_reached";
}
