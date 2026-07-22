#!/usr/bin/env node
/**
 * GEM.IQ Hub — IQ starter kit initializer.
 *
 * Run inside a NEW IQ project to wire it into the Hub in one step:
 *
 *   curl -sSL https://raw.githubusercontent.com/GlobalEdgeMarkets/gemiq-unified-hub/main/scripts/hub-init.mjs | node
 *
 * or, if the file is already local:
 *
 *   node hub-init.mjs
 *
 * What it does (all edits scoped to the CURRENT working directory):
 *   1. Copies scripts/pull-hub-sdk.mjs from the Hub repo.
 *   2. Adds "pull:hub-sdk" + "prebuild" scripts to package.json.
 *   3. Runs the puller once so src/lib/hub.ts + src/lib/hub-manifest.json exist.
 *   4. Writes src/lib/hub-client.ts with a ready-to-use createHubClient().
 *   5. Appends VITE_HUB_ORIGIN=... to .env.example.
 *   6. Writes HUB_INTEGRATION.md — the 5-step IQ contract checklist.
 *
 * Idempotent: re-running is safe. Existing files are only rewritten when
 * they're the auto-generated ones this script owns.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

const REPO = process.env.HUB_SDK_REPO || "GlobalEdgeMarkets/gemiq-unified-hub";
const REF  = process.env.HUB_SDK_REF  || "main";
const HUB_ORIGIN = process.env.HUB_ORIGIN || "https://gemiq.globaledgemarkets.com";
const cwd = process.cwd();

const raw = (path) => `https://raw.githubusercontent.com/${REPO}/${REF}/${path}`;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) { console.error(`✗ ${res.status} ${res.statusText} — ${url}`); process.exit(1); }
  return res.text();
}
function write(rel, body) {
  const p = resolve(cwd, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
  console.log(`✓ wrote ${rel}`);
}
function readJson(rel) {
  try { return JSON.parse(readFileSync(resolve(cwd, rel), "utf8")); } catch { return null; }
}

// 1. Puller
const puller = await fetchText(raw("packages/hub-sdk/pull-hub-sdk.mjs"));
write("scripts/pull-hub-sdk.mjs", puller);

// 2. package.json scripts
const pkg = readJson("package.json");
if (!pkg) { console.error("✗ no package.json in current directory — run this from the IQ project root."); process.exit(1); }
pkg.scripts ??= {};
let pkgChanged = false;
if (pkg.scripts["pull:hub-sdk"] !== "node scripts/pull-hub-sdk.mjs") {
  pkg.scripts["pull:hub-sdk"] = "node scripts/pull-hub-sdk.mjs";
  pkgChanged = true;
}
if (!pkg.scripts.prebuild?.includes("pull-hub-sdk.mjs")) {
  pkg.scripts.prebuild = pkg.scripts.prebuild
    ? `${pkg.scripts.prebuild} && node scripts/pull-hub-sdk.mjs`
    : "node scripts/pull-hub-sdk.mjs";
  pkgChanged = true;
}
if (pkgChanged) {
  write("package.json", JSON.stringify(pkg, null, 2) + "\n");
} else {
  console.log("✓ package.json scripts already wired");
}

// 3. Run the puller once
console.log("\n↓ running scripts/pull-hub-sdk.mjs …");
const pull = spawnSync("node", ["scripts/pull-hub-sdk.mjs"], { cwd, stdio: "inherit" });
if (pull.status !== 0) process.exit(pull.status ?? 1);

// 4. Hub client stub — only if missing (never clobber user code)
const clientPath = "src/lib/hub-client.ts";
if (!existsSync(resolve(cwd, clientPath))) {
  write(clientPath, `import { createHubClient } from "@/lib/hub";
import manifest from "@/lib/hub-manifest.json";

/**
 * Shared Hub client for this IQ. Import \`hub\` anywhere you need auth,
 * subscription, results, profile, or manifest access.
 *
 * Live brand/pricing sync: call hub.manifest.watch() once at app boot.
 */
export const hub = createHubClient({
  hubOrigin: import.meta.env.VITE_HUB_ORIGIN || manifest.hub.origin,
});
`);
} else {
  console.log(`✓ ${clientPath} already exists — left as is`);
}

// 5. .env.example
const envPath = resolve(cwd, ".env.example");
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
if (!/^VITE_HUB_ORIGIN=/m.test(env)) {
  env += (env && !env.endsWith("\n") ? "\n" : "") + `VITE_HUB_ORIGIN=${HUB_ORIGIN}\n`;
  writeFileSync(envPath, env);
  console.log("✓ wrote .env.example");
} else {
  console.log("✓ .env.example already has VITE_HUB_ORIGIN");
}

// 6. IQ contract checklist
write("HUB_INTEGRATION.md", `# Hub integration — IQ contract

Every IQ MUST do these five things. Nothing else.

1. **Gate the assessment** — before rendering the assessment, call:
   \`\`\`ts
   const status = await hub.subscription.check();
   if (!status.authenticated) return hub.redirectToLogin(window.location.href);
   if (!status.active) return hub.subscription.startCheckout("gemiq_professional_monthly", {
     trial: true,
     successUrl: window.location.origin + "/resume?sid={CHECKOUT_SESSION_ID}",
     cancelUrl:  window.location.href,
   });
   \`\`\`

2. **Resume page** at \`/resume\`:
   \`\`\`ts
   const status = await hub.subscription.waitUntilActive({ timeoutMs: 15000 });
   if (status.active) router.replace("/start");
   \`\`\`

3. **Submit results** via the upgrade-aware helper (handles 402 automatically):
   \`\`\`ts
   await hub.results.submitOrUpgrade({
     email, assessment_key: "${(readJson("package.json")?.name ?? "yourid").replace(/[^a-z0-9]/g, "")}",
     score, tier, dimensions, detail: { /* IQ-specific */ }, metadata: { first_name, last_name, company },
   });
   \`\`\`

4. **Live brand/pricing sync** — once at app boot:
   \`\`\`ts
   hub.manifest.watch({ intervalMs: 5 * 60_000 }, (next) => applyBrand(next));
   \`\`\`

5. **Never write to HubSpot / Stripe / Auth directly.** The Hub is the only writer.

Full docs: ${HUB_ORIGIN}/docs
`);

console.log(`
✓ IQ wired into Hub at ${HUB_ORIGIN}
  - Edit ${clientPath} if you need to customize the client.
  - Read HUB_INTEGRATION.md for the 5-step contract.
  - src/lib/hub.ts + src/lib/hub-manifest.json refresh on every build.
`);
