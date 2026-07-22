#!/usr/bin/env node
/**
 * Mirrors Hub source-of-truth files into packages/hub-sdk/ so IQ teams can
 * pull them from a stable path in GitHub.
 *
 *   src/lib/hub/sdk.ts         -> packages/hub-sdk/sdk.ts     (with AUTO-GENERATED banner)
 *   src/lib/hub/manifest.json  -> packages/hub-sdk/manifest.json
 *
 * Usage:
 *   node scripts/sync-hub-sdk.mjs         # copy source -> package
 *   node scripts/sync-hub-sdk.mjs --check # fail if out of sync (CI mode)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const SDK_BANNER =
  "// AUTO-GENERATED — DO NOT EDIT.\n" +
  "// Source of truth: src/lib/hub/sdk.ts\n" +
  "// Regenerate with: node scripts/sync-hub-sdk.mjs\n\n";

const targets = [
  {
    label: "sdk",
    source: resolve(root, "src/lib/hub/sdk.ts"),
    target: resolve(root, "packages/hub-sdk/sdk.ts"),
    transform: (s) => SDK_BANNER + s,
  },
  {
    label: "manifest",
    source: resolve(root, "src/lib/hub/manifest.json"),
    target: resolve(root, "packages/hub-sdk/manifest.json"),
    transform: (s) => JSON.stringify(JSON.parse(s), null, 2) + "\n",
  },
];

let drift = false;
for (const { label, source, target, transform } of targets) {
  const expected = transform(readFileSync(source, "utf8"));
  let current = "";
  try { current = readFileSync(target, "utf8"); } catch {}
  if (current === expected) { console.log(`✓ ${label} in sync`); continue; }
  if (check) {
    console.error(`✗ ${label} out of sync — run: node scripts/sync-hub-sdk.mjs`);
    drift = true;
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected);
  console.log(`✓ wrote ${target}`);
}

if (drift) process.exit(1);
