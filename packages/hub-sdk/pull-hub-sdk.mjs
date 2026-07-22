#!/usr/bin/env node
/**
 * TEMPLATE for IQ projects (tariffiq / readinessiq / uxiq / techservicesiq / ...).
 * Copy this file into your IQ repo at: scripts/pull-hub-sdk.mjs
 *
 * What it does:
 *   Pulls two artifacts from the gemiq-unified-hub GitHub repo:
 *     1. The Hub SDK        -> src/lib/hub.ts
 *     2. The Hub Manifest   -> src/lib/hub-manifest.json
 *          (brand tokens, pricing, deep links, assessment registry, SDK version)
 *   Runs before every build so IQs never drift from Hub branding, pricing,
 *   or contract. Fails CI when the local manifest is behind the remote one
 *   (unless HUB_ALLOW_STALE=1).
 *
 * Wire it up in your IQ project's package.json:
 *   {
 *     "scripts": {
 *       "pull:hub-sdk": "node scripts/pull-hub-sdk.mjs",
 *       "prebuild":     "node scripts/pull-hub-sdk.mjs"
 *     }
 *   }
 *
 * Import in your IQ code:
 *   import { createHubClient } from "@/lib/hub";
 *   import manifest from "@/lib/hub-manifest.json";
 *
 * At runtime, also subscribe to live changes:
 *   const hub = createHubClient({ hubOrigin: manifest.hub.origin });
 *   hub.manifest.watch({ intervalMs: 5 * 60_000 }, (next) => applyBrand(next));
 *
 * Env overrides (optional):
 *   HUB_SDK_REPO       default: GlobalEdgeMarkets/gemiq-unified-hub
 *   HUB_SDK_REF        default: main
 *   HUB_SDK_PATH       default: packages/hub-sdk/sdk.ts
 *   HUB_SDK_DEST       default: src/lib/hub.ts
 *   HUB_MANIFEST_PATH  default: packages/hub-sdk/manifest.json
 *   HUB_MANIFEST_DEST  default: src/lib/hub-manifest.json
 *   HUB_ALLOW_STALE    default: unset (set to "1" to skip version check)
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO = process.env.HUB_SDK_REPO || "GlobalEdgeMarkets/gemiq-unified-hub";
const REF  = process.env.HUB_SDK_REF  || "main";

const SDK_PATH = process.env.HUB_SDK_PATH || "packages/hub-sdk/sdk.ts";
const SDK_DEST = resolve(process.cwd(), process.env.HUB_SDK_DEST || "src/lib/hub.ts");

const MANIFEST_PATH = process.env.HUB_MANIFEST_PATH || "packages/hub-sdk/manifest.json";
const MANIFEST_DEST = resolve(process.cwd(), process.env.HUB_MANIFEST_DEST || "src/lib/hub-manifest.json");

const raw = (path) => `https://raw.githubusercontent.com/${REPO}/${REF}/${path}`;

const SDK_BANNER =
  "// AUTO-PULLED FROM HUB — DO NOT EDIT.\n" +
  `// Source: https://github.com/${REPO}/blob/${REF}/${SDK_PATH}\n` +
  "// Regenerate with: node scripts/pull-hub-sdk.mjs\n\n";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ fetch failed: ${res.status} ${res.statusText} — ${url}`);
    process.exit(1);
  }
  return res.text();
}

function readJsonIfExists(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function cmpSemver(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function pullSdk() {
  const url = raw(SDK_PATH);
  console.log(`↓ SDK      ${url}`);
  const remote = await fetchText(url);
  const next = SDK_BANNER + remote;
  let current = "";
  try { current = readFileSync(SDK_DEST, "utf8"); } catch {}
  if (current === next) { console.log(`✓ ${SDK_DEST} up to date`); return; }
  mkdirSync(dirname(SDK_DEST), { recursive: true });
  writeFileSync(SDK_DEST, next);
  console.log(`✓ wrote ${SDK_DEST} (${remote.length} bytes)`);
}

async function pullManifest() {
  const url = raw(MANIFEST_PATH);
  console.log(`↓ manifest ${url}`);
  const remote = await fetchText(url);
  let remoteJson;
  try { remoteJson = JSON.parse(remote); }
  catch (e) { console.error(`✗ manifest is not valid JSON: ${e.message}`); process.exit(1); }

  const local = readJsonIfExists(MANIFEST_DEST);
  if (local && local.version && remoteJson.version) {
    const diff = cmpSemver(local.version, remoteJson.version);
    if (diff > 0 && !process.env.HUB_ALLOW_STALE) {
      console.error(`✗ local manifest (${local.version}) is AHEAD of hub (${remoteJson.version}).`);
      console.error(`  Set HUB_ALLOW_STALE=1 to bypass.`);
      process.exit(1);
    }
    if (diff < 0) {
      console.log(`↑ upgrading manifest ${local.version} → ${remoteJson.version}`);
    }
  }

  mkdirSync(dirname(MANIFEST_DEST), { recursive: true });
  writeFileSync(MANIFEST_DEST, JSON.stringify(remoteJson, null, 2) + "\n");
  console.log(`✓ wrote ${MANIFEST_DEST} (v${remoteJson.version})`);
}

await pullSdk();
await pullManifest();
