#!/usr/bin/env node
/**
 * Mirrors the Hub SDK into packages/hub-sdk/ so IQ teams can pull it from a
 * stable path in GitHub.
 *
 *   src/lib/hub/sdk.ts -> packages/hub-sdk/sdk.ts  (with AUTO-GENERATED banner)
 *
 * The manifest is NOT mirrored: src/lib/hub/manifest.json is the single source
 * of truth and IQs pull it directly from that path via pull-hub-sdk.mjs.
 *
 * Usage:
 *   node scripts/mirror-sdk.mjs         # copy source -> package
 *   node scripts/mirror-sdk.mjs --check # fail if out of sync (CI mode)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const SDK_BANNER =
  "// AUTO-GENERATED — DO NOT EDIT.\n" +
  "// Source of truth: src/lib/hub/sdk.ts\n" +
  "// Regenerate with: node scripts/mirror-sdk.mjs\n\n";

const source = resolve(root, "src/lib/hub/sdk.ts");
const target = resolve(root, "packages/hub-sdk/sdk.ts");

const expected = SDK_BANNER + readFileSync(source, "utf8");
let current = "";
try {
  current = readFileSync(target, "utf8");
} catch {}

if (current === expected) {
  console.log("✓ sdk in sync");
  process.exit(0);
}

if (check) {
  console.error("✗ sdk out of sync — run: node scripts/mirror-sdk.mjs");
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, expected);
console.log(`✓ wrote ${target}`);
