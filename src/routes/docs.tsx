import { createFileRoute } from "@tanstack/react-router";
import { HubHeader } from "@/components/HubHeader";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "GEM.IQ Hub — Developer Docs (Trial + Submit)" },
      {
        name: "description",
        content:
          "How TariffIQ, ReadinessIQ, UXIQ, and TechServicesIQ start the 7-day trial and submit results via @gemiq/hub-sdk.",
      },
      { property: "og:title", content: "GEM.IQ Hub — Developer Docs" },
      {
        property: "og:description",
        content:
          "SDK integration guide for the 7-day trial, checkout, and result submission across all GEM.IQ assessments.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "GEM.IQ Hub — Developer Docs" },
      {
        name: "twitter:description",
        content:
          "SDK integration guide for the 7-day trial, checkout, and result submission.",
      },
    ],
  }),
  component: DocsPage,
});

function Code({ children }: { children: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-lg border border-[#172864]/10 bg-[#F4F7FB] p-4 text-[13px] leading-relaxed text-[#172864]">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[#172864]/10 py-10 first:border-t-0">
      <h2 className="font-display text-2xl font-semibold text-[#172864] sm:text-3xl">{title}</h2>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#2C365B]/85">
        {children}
      </div>
    </section>
  );
}

function DocsPage() {
  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#172864]">
      <HubHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#05CFAB]">
            Developer Docs
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#172864] sm:text-5xl">
            Start the 7-day trial &amp; submit results
          </h1>
          <p className="mt-4 text-lg text-[#2C365B]/75">
            For TariffIQ, ReadinessIQ, UXIQ, TechServicesIQ, and any future IQ. Everything
            runs through <code className="rounded bg-[#172864]/8 px-1.5 py-0.5">@gemiq/hub-sdk</code>{" "}
            — no direct Stripe, Supabase, or HubSpot calls from your IQ.
          </p>

          <nav className="mt-6 flex flex-wrap gap-2 text-sm">
            {[
              ["install", "1. Install"],
              ["init", "2. Initialize"],
              ["gate", "3. Gate the assessment"],
              ["trial", "4. Start the trial"],
              ["resume", "5. Resume page"],
              ["submit", "6. Submit results"],
              ["limits", "7. Trial limits"],
              ["deeplink", "8. Deep links"],
              ["manifest", "9. Central manifest"],
              ["reference", "Reference"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-full border border-[#172864]/10 bg-white px-3 py-1 text-[#172864] hover:bg-[#DCE7F2]"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        <Section id="install" title="1. Install the SDK (auto-pull)">
          <p>
            The Hub owns the SDK. Your IQ pulls it on every build so you always ship against
            the current contract.
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Copy <code>packages/hub-sdk/pull-hub-sdk.mjs</code> from the Hub repo into your
              IQ at <code>scripts/pull-hub-sdk.mjs</code>.
            </li>
            <li>Add scripts to your IQ's <code>package.json</code>:</li>
          </ol>
          <Code>{`{
  "scripts": {
    "pull:hub-sdk": "node scripts/pull-hub-sdk.mjs",
    "prebuild":     "node scripts/pull-hub-sdk.mjs"
  }
}`}</Code>
          <p>
            Run <code>node scripts/pull-hub-sdk.mjs</code> once locally. It writes{" "}
            <code>src/lib/hub.ts</code>. Never edit that file — it's regenerated on every build.
          </p>
        </Section>

        <Section id="init" title="2. Initialize the client">
          <Code>{`// src/lib/hub-client.ts
import { createHubClient } from "@/lib/hub";

export const hub = createHubClient({
  hubOrigin: "https://gemiq.globaledgemarkets.com",
});`}</Code>
          <p>
            Because the Hub sets its auth cookie on <code>.globaledgemarkets.com</code>, every
            IQ subdomain sees the same session — no token passing.
          </p>
        </Section>

        <Section id="gate" title="3. Gate the assessment on session + subscription">
          <p>Call this at the entry point of the assessment (or any paywalled page):</p>
          <Code>{`const status = await hub.subscription.check();

if (!status.authenticated) {
  return hub.redirectToLogin(window.location.href);
}

if (!status.active) {
  // Not subscribed and not trialing — send them to checkout.
  await hub.subscription.startCheckout("gemiq_professional_monthly", {
    successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
    cancelUrl:  window.location.href,
  });
  return; // browser navigates to Stripe
}

// status.active === true → let the assessment run.`}</Code>
          <p>
            <code>status.active</code> is <code>true</code> for both{" "}
            <code>active</code> and <code>trialing</code> Stripe states.
          </p>
        </Section>

        <Section id="trial" title="4. Start the 7-day free trial">
          <p>
            Add a <strong>Start 7-day free trial</strong> button next to your existing subscribe
            CTA. Pass <code>trial: true</code>:
          </p>
          <Code>{`await hub.subscription.startCheckout("gemiq_professional_monthly", {
  successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
  cancelUrl:  window.location.href,
  trial: true,
});`}</Code>
          <p>
            Use <code>gemiq_professional_annual</code> for the annual variant. Card is required
            up-front; the subscription auto-converts on day 7. Stripe sends the reminder email
            3 days before conversion automatically.
          </p>
          <p>
            Trial ships <strong>one free assessment across any IQ</strong> — enforced by the
            Hub, not by your IQ.
          </p>
        </Section>

        <Section id="resume" title="5. Resume page after Stripe returns">
          <p>
            Stripe redirects back to your <code>successUrl</code> with{" "}
            <code>?sid=&lt;checkout_session_id&gt;</code>. The webhook usually lands within a
            second but can lag a few. Poll until active:
          </p>
          <Code>{`// /resume route
const status = await hub.subscription.waitUntilActive({ timeoutMs: 15000 });
if (status.active) {
  router.replace("/start");
} else {
  showRetryButton();
}`}</Code>
        </Section>

        <Section id="submit" title="6. Submit results">
          <p>At the end of the assessment:</p>
          <Code>{`await hub.results.submit({
  email: user.email,
  assessment_key: "tariffiq", // or "readinessiq" | "uxiq" | "techservicesiq"
  score,
  tier,          // lowercase: "emerging" | "developing" | "established" | "advanced" | "leading"
  dimensions,    // { [dimensionKey]: number }
  detail: {
    // IQ-specific rich payload — stored verbatim, mapped to gem_* HubSpot properties
    // by the Hub's registry entry for this IQ.
  },
  metadata: { first_name, last_name, company },
  report_url: "https://.../report.pdf", // shown in internal notification email
});`}</Code>
          <p>The Hub handles all of the following — you do not:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Dedupe (10-minute window per email + IQ)</li>
            <li>DB insert into <code>submissions</code></li>
            <li>HubSpot contact upsert with <code>gem_*</code> properties</li>
            <li>
              HubSpot Lead creation: <strong>Warm</strong> on every submit,{" "}
              <strong>Hot</strong> when <code>score ≥ 80</code>
            </li>
            <li>
              Internal notification email to <code>info@globaledgemarkets.com</code> and{" "}
              <code>alexr@globaledgemarkets.com</code>
            </li>
            <li>Retry queue on HubSpot failure</li>
            <li>Trial assessment counter increment</li>
          </ul>
        </Section>

        <Section id="limits" title="7. Handling the trial limit (402)">
          <p>
            Once a trialing user consumes their one free assessment,{" "}
            <code>hub.results.submit()</code> throws with{" "}
            <code>status === 402</code> and{" "}
            <code>body.error === "trial_limit_reached"</code>. Prompt an upgrade:
          </p>
          <Code>{`try {
  await hub.results.submit(payload);
} catch (e: any) {
  if (e.status === 402 && e.body?.error === "trial_limit_reached") {
    // Trial exhausted — upgrade to full subscription (no trial flag).
    await hub.subscription.startCheckout("gemiq_professional_monthly", {
      successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
      cancelUrl:  window.location.href,
    });
    return;
  }
  throw e;
}`}</Code>
          <p>Optional UX polish using <code>status</code>:</p>
          <Code>{`const status = await hub.subscription.check();

if (status.trialing) {
  // Show "Trial — 1 free assessment" badge in your header
}
if (status.trial_exhausted) {
  // Swap the primary CTA to "Upgrade to continue"
}`}</Code>
        </Section>

        <Section id="deeplink" title="8. Deep-link straight to signup + trial">
          <p>
            Marketing pages and blog CTAs can send visitors directly into the Hub signup with
            the trial preselected:
          </p>
          <Code>{`https://gemiq.globaledgemarkets.com/auth?mode=signup&trial=1&plan=monthly
https://gemiq.globaledgemarkets.com/auth?mode=signup&trial=1&plan=annual`}</Code>
          <p>
            After signup, the Hub auto-initiates Stripe checkout with{" "}
            <code>trial_period_days: 7</code> on the chosen plan.
          </p>
        </Section>

        <Section id="manifest" title="9. Central manifest — brand, pricing, deep links">
          <p>
            The Hub publishes a single manifest at{" "}
            <code>/api/public/manifest</code> that every IQ should treat as the source of
            truth for brand tokens, pricing, deep links, and the assessment registry.
            The manifest is also committed to GitHub at{" "}
            <code>packages/hub-sdk/manifest.json</code> so IQ builds can pin it.
          </p>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#172864]">
            Build-time pull (recommended)
          </h3>
          <p>
            The updated <code>pull-hub-sdk.mjs</code> now pulls both the SDK and the
            manifest on every build, and fails the build if your IQ's local manifest is
            ahead of the Hub's:
          </p>
          <Code>{`↓ SDK      https://raw.githubusercontent.com/.../sdk.ts
↓ manifest https://raw.githubusercontent.com/.../manifest.json
✓ wrote src/lib/hub.ts
✓ wrote src/lib/hub-manifest.json (v1.0.0)`}</Code>
          <p>Use it in your IQ:</p>
          <Code>{`import manifest from "@/lib/hub-manifest.json";

// Brand tokens straight from the Hub
document.documentElement.style.setProperty("--gem-mint", manifest.brand.colors.mint);
document.documentElement.style.setProperty("--gem-navy", manifest.brand.colors.navy);

// Pricing — never hard-code
const monthly = manifest.pricing.plans.find(p => p.interval === "month");`}</Code>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#172864]">
            Runtime polling — live updates without a redeploy
          </h3>
          <p>
            Subscribe to changes so brand, pricing, and deep-link updates propagate to
            already-loaded IQ sessions:
          </p>
          <Code>{`import { createHubClient } from "@/lib/hub";
import initial from "@/lib/hub-manifest.json";

const hub = createHubClient({ hubOrigin: initial.hub.origin });

const stop = hub.manifest.watch(
  { intervalMs: 5 * 60_000 },  // 5 min; server sends 304 when unchanged
  (next, previous) => {
    console.log("Hub manifest changed", previous?.version, "→", next.version);
    applyBrandTokens(next.brand);
    refreshPricingUI(next.pricing);
  },
);

// stop() on unmount if needed`}</Code>
          <p className="text-sm text-[#2C365B]/60">
            The endpoint sets a strong <code>ETag</code> and{" "}
            <code>Cache-Control: max-age=60, stale-while-revalidate=600</code>, and
            responds with <code>304</code> when the client's{" "}
            <code>If-None-Match</code> matches — polling is effectively free.
          </p>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#172864]">Manifest shape</h3>
          <Code>{`{
  version: "1.0.0",
  etag: "\\"1.0.0-<hash>\\"",
  hub:   { origin, docs_url, sdk_source, manifest_source, repo },
  brand: { name, fonts, colors, logos, usage_rules },
  pricing: {
    currency, trial: { days, assessments_included, card_required },
    plans: [{ id, name, amount, interval, lookup_key }]
  },
  assessments: [{ key, name, url }],
  deep_links: { signup_trial_monthly, signup_trial_annual, login, portal }
}`}</Code>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#172864]">
            GitHub sources of truth
          </h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>SDK — <code>packages/hub-sdk/sdk.ts</code></li>
            <li>Manifest — <code>packages/hub-sdk/manifest.json</code> (semver — bump on every change)</li>
            <li>Puller — <code>packages/hub-sdk/pull-hub-sdk.mjs</code> (copy into each IQ)</li>
            <li>Repo — <code>GlobalEdgeMarkets/gemiq-unified-hub</code></li>
          </ul>
        </Section>

        <Section id="reference" title="Reference">
          <h3 className="font-display text-lg font-semibold text-[#172864]">SDK surface</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><code>hub.subscription.check()</code> → <code>CheckStatus</code></li>
            <li>
              <code>hub.subscription.startCheckout(lookup_key, {`{ successUrl, cancelUrl, trial? }`})</code>
            </li>
            <li><code>hub.subscription.waitUntilActive({`{ timeoutMs?, intervalMs? }`})</code></li>
            <li><code>hub.subscription.openPortal(returnUrl)</code></li>
            <li><code>hub.results.submit(payload)</code></li>
            <li><code>hub.results.history()</code></li>
            <li><code>hub.profile.get()</code> / <code>hub.profile.update(patch)</code></li>
            <li><code>hub.manifest.get({`{ etag? }`})</code> — one-shot fetch with 304 support</li>
            <li><code>hub.manifest.watch({`{ intervalMs? }`}, onChange)</code> — live polling</li>
            <li><code>hub.redirectToLogin(returnTo, mode?)</code></li>
          </ul>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#172864]">Stripe lookup keys</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li><code>gemiq_professional_monthly</code> — $99/mo</li>
            <li><code>gemiq_professional_annual</code> — $990/yr</li>
          </ul>

          <h3 className="mt-6 font-display text-lg font-semibold text-[#172864]">CheckStatus shape</h3>
          <Code>{`{
  authenticated: boolean;
  active: boolean;          // true for "active" OR "trialing"
  trialing?: boolean;
  trial_exhausted?: boolean;
  user?: { id, email };
  subscription: {
    status, lookup_key, current_period_end, cancel_at_period_end,
    stripe_subscription_id,
    trial_ends_at, trial_assessments_used, trial_assessment_limit
  } | null;
}`}</Code>

          <p className="mt-6 text-sm text-[#2C365B]/60">
            Full integration guide including HubSpot property registration and legacy user
            import lives in <code>INTEGRATING.md</code> in the Hub repo.
          </p>
        </Section>
      </main>
    </div>
  );
}
