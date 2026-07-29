import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { HubHeader } from "@/components/HubHeader";
import { REGISTRY } from "@/lib/hub/assessments";
import manifest from "@/lib/hub/manifest.json";

export const Route = createFileRoute("/onboard")({
  head: () => ({
    meta: [
      { title: "Onboard an IQ — GEM.IQ Hub" },
      {
        name: "description",
        content:
          "Pick your assessment key and get the exact init command, Hub client, env vars, CI job, and paste-in prompt to wire an IQ into the GEM.IQ Hub.",
      },
      { property: "og:title", content: "Onboard an IQ — GEM.IQ Hub" },
      {
        property: "og:description",
        content:
          "Guided one-click onboarding: register an assessment_key and receive the correct Hub config automatically.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Onboard an IQ — GEM.IQ Hub" },
      {
        name: "twitter:description",
        content: "Register an assessment_key and get the exact Hub config for your IQ.",
      },
    ],
  }),
  component: OnboardPage,
});

const HUB_ORIGIN = manifest.hub.origin;
const REPO = manifest.hub.repo;

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          setDone(false);
        }
      }}
      className="rounded-md border border-gem-mint/40 bg-gem-mint/10 px-3 py-1 text-xs font-semibold text-gem-mint transition hover:bg-gem-mint/20"
    >
      {done ? "Copied" : label}
    </button>
  );
}

function Block({
  step,
  title,
  hint,
  code,
}: {
  step: number;
  title: string;
  hint?: string;
  code: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gem-mint">
            Step {step}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">{title}</h2>
          {hint ? <p className="mt-1 text-sm text-slate-400">{hint}</p> : null}
        </div>
        <CopyButton text={code} />
      </div>
      <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-[#0b1020] p-4 text-[13px] leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </section>
  );
}

// ReadinessIQ is retired — it stays in the registry for legacy submission
// mapping, but is never offered as an onboarding target.
const ONBOARDABLE = REGISTRY.filter((s) => s.key !== "readinessiq");

function OnboardPage() {
  const [key, setKey] = useState(ONBOARDABLE[0]?.key ?? "tariffiq");
  const spec = ONBOARDABLE.find((s) => s.key === key);
  const displayName = spec?.displayName ?? key;

  const initCmd = useMemo(
    () =>
      `curl -sSL https://raw.githubusercontent.com/${REPO}/main/scripts/hub-init.mjs -o /tmp/hub-init.mjs \\\n  && node /tmp/hub-init.mjs --key ${key}`,
    [key],
  );

  const envBlock = useMemo(
    () => `VITE_HUB_ORIGIN=${HUB_ORIGIN}\nVITE_ASSESSMENT_KEY=${key}`,
    [key],
  );

  const clientCode = useMemo(
    () => `// src/lib/hub-client.ts — written by hub-init, safe to keep as is
import { createHubClient } from "@/lib/hub";
import manifest from "@/lib/hub-manifest.json";

export const ASSESSMENT_KEY = "${key}";

export const hub = createHubClient({
  hubOrigin: import.meta.env.VITE_HUB_ORIGIN || manifest.hub.origin,
});

// Live brand + pricing sync (no rebuild needed)
hub.manifest.watch({ intervalMs: 5 * 60_000 }, (next) => {
  document.documentElement.style.setProperty("--gem-mint", next.brand.colors.mint);
  document.documentElement.style.setProperty("--gem-navy", next.brand.colors.navy);
});`,
    [key],
  );

  const ciYml = `name: check-hub-sdk-sync
on:
  push:
    paths: ["src/lib/hub.ts", "scripts/pull-hub-sdk.mjs"]
  pull_request:
    paths: ["src/lib/hub.ts", "scripts/pull-hub-sdk.mjs"]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: node scripts/pull-hub-sdk.mjs
      - run: git diff --exit-code src/lib/hub.ts src/lib/hub-manifest.json`;

  const gateCode = useMemo(
    () => `import { hub, ASSESSMENT_KEY } from "@/lib/hub-client";

// Gate the assessment
const status = await hub.subscription.check();
if (!status.authenticated) hub.redirectToLogin(window.location.href);
else if (!status.active) {
  await hub.subscription.startCheckout("gemiq_professional_monthly", {
    successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
    cancelUrl: window.location.href,
  });
}

// /resume page
const resumed = await hub.subscription.waitUntilActive({ timeoutMs: 15000 });
if (resumed.active) navigate("/start");

// Final submission (handles the 402 trial limit by upgrading)
await hub.results.submitOrUpgrade({
  email,
  assessment_key: ASSESSMENT_KEY, // "${key}"
  score,
  tier, // reactive | developing | defined | advanced | optimized
  dimensions,
  detail: {},
  metadata: { first_name, last_name, company, report_url },
});`,
    [key],
  );

  const fullPrompt = useMemo(
    () => `Wire this project into the GEM.IQ Hub as assessment_key "${key}" (${displayName}).
Do exactly these steps and nothing else.

1. Run in the sandbox:
${initCmd}
   It writes scripts/pull-hub-sdk.mjs, src/lib/hub.ts, src/lib/hub-manifest.json,
   src/lib/hub-client.ts, HUB_INTEGRATION.md and adds pull:hub-sdk + prebuild to package.json.
   Never hand-edit src/lib/hub.ts — it is regenerated on every build.

2. Add these env values (.env and .env.example):
${envBlock}

3. Make src/lib/hub-client.ts match this:
${clientCode}

4. Add .github/workflows/check-hub-sdk.yml:
${ciYml}

5. Gate, resume, and submit exactly like this:
${gateCode}

Rules: never call HubSpot, Stripe, or Supabase Auth directly — the Hub is the only writer.
Tiers must be one of: reactive, developing, defined, advanced, optimized.
Drive colors, fonts, price labels, and IQ links from the Hub manifest — never hardcode them.
Docs: ${HUB_ORIGIN}/docs`,
    [key, displayName, initCmd, envBlock, clientCode, ciYml, gateCode],
  );

  return (
    <div className="min-h-screen bg-[#0a0f1f] text-slate-200">
      <HubHeader />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <header className="pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gem-mint">
            IQ Onboarding
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">
            Register your assessment key
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-300">
            Pick your IQ below. Everything on this page regenerates for that key —
            copy the whole thing into your IQ project&apos;s Lovable chat and it wires
            itself into the Hub: SDK, manifest sync, checkout gate, and submissions.
          </p>
        </header>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Assessment key
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {REGISTRY.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setKey(s.key)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  s.key === key
                    ? "border-gem-mint bg-gem-mint/15 text-gem-mint"
                    : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25"
                }`}
              >
                {s.displayName}
                <span className="ml-2 font-mono text-xs opacity-60">{s.key}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Not listed? The key must be registered in the Hub assessment registry first —
            submissions with an unknown key are dropped.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-gem-mint/30 bg-gem-mint/[0.07] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                One-click: full setup prompt for {displayName}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Paste this into the {displayName} project&apos;s Lovable chat. Its agent runs
                the init script and applies every step below.
              </p>
            </div>
            <CopyButton text={fullPrompt} label="Copy full prompt" />
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <Block
            step={1}
            title="Pull the SDK + manifest"
            hint="Run once in the IQ project. Adds prebuild so every build re-pulls."
            code={initCmd}
          />
          <Block step={2} title="Environment" code={envBlock} />
          <Block
            step={3}
            title="Hub client + live brand sync"
            hint="Brand and pricing changes propagate within minutes — no rebuild."
            code={clientCode}
          />
          <Block
            step={4}
            title="CI drift check (optional)"
            hint="Fails a PR whose vendored SDK has drifted from the Hub."
            code={ciYml}
          />
          <Block
            step={5}
            title="Gate, resume, submit"
            hint={`assessment_key is locked to "${key}".`}
            code={gateCode}
          />
        </div>

        <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
          Verify: <code className="text-slate-200">src/lib/hub.ts</code> carries the
          AUTO-PULLED banner, the local manifest version matches{" "}
          <a className="text-gem-mint hover:underline" href="/api/public/manifest">
            /api/public/manifest
          </a>
          , and a test submission appears on{" "}
          <a className="text-gem-mint hover:underline" href="/dashboard">
            /dashboard
          </a>{" "}
          and in HubSpot.
        </footer>
      </main>
    </div>
  );
}
