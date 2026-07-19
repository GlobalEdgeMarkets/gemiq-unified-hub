#!/usr/bin/env node
/**
 * TEMPLATE for IQ projects (tariffiq / readinessiq / uxiq / techservicesiq / ...).
 * Copy this file into your IQ repo at: scripts/pull-hub-sdk.mjs
 *
 * What it does:
 *   Fetches the current Hub SDK from the gemiq-unified-hub GitHub repo
 *   and writes it to src/lib/hub.ts in your IQ project. Runs automatically
 *   before every build so your IQ always ships against the latest contract.
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
 *
 * Env overrides (optional):
 *   HUB_SDK_REPO   default: GlobalEdgeMarkets/gemiq-unified-hub
 *   HUB_SDK_REF    default: main
 *   HUB_SDK_PATH   default: packages/hub-sdk/sdk.ts
 *   HUB_SDK_DEST   default: src/lib/hub.ts
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPO = process.env.HUB_SDK_REPO || "GlobalEdgeMarkets/gemiq-unified-hub";
const REF  = process.env.HUB_SDK_REF  || "main";
const PATH = process.env.HUB_SDK_PATH || "packages/hub-sdk/sdk.ts";
const DEST = resolve(process.cwd(), process.env.HUB_SDK_DEST || "src/lib/hub.ts");

const url = `https://raw.githubusercontent.com/${REPO}/${REF}/${PATH}`;

const BANNER =
  "// AUTO-PULLED FROM HUB — DO NOT EDIT.\n" +
  `// Source: https://github.com/${REPO}/blob/${REF}/${PATH}\n` +
  "// Regenerate with: node scripts/pull-hub-sdk.mjs\n\n";

async function main() {
  console.log(`↓ pulling hub SDK from ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ fetch failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const remote = await res.text();
  const next = BANNER + remote;

  let current = "";
  try { current = readFileSync(DEST, "utf8"); } catch {}
  if (current === next) {
    console.log(`✓ ${DEST} already up to date`);
    return;
  }

  mkdirSync(dirname(DEST), { recursive: true });
  writeFileSync(DEST, next);
  console.log(`✓ wrote ${DEST} (${remote.length} bytes)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
