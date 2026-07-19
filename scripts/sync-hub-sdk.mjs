#!/usr/bin/env node
/**
 * Keeps packages/hub-sdk/sdk.ts in sync with src/lib/hub/sdk.ts (the source
 * of truth). IQ teams copy from packages/hub-sdk/, so this file must never
 * drift from the SDK the Hub itself imports.
 *
 * Usage:
 *   node scripts/sync-hub-sdk.mjs         # copy source -> package
 *   node scripts/sync-hub-sdk.mjs --check # fail if out of sync (CI mode)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(root, "src/lib/hub/sdk.ts");
const TARGET = resolve(root, "packages/hub-sdk/sdk.ts");
const BANNER =
  "// AUTO-GENERATED — DO NOT EDIT.\n" +
  "// Source of truth: src/lib/hub/sdk.ts\n" +
  "// Regenerate with: node scripts/sync-hub-sdk.mjs\n\n";

const check = process.argv.includes("--check");
const source = readFileSync(SOURCE, "utf8");
const expected = BANNER + source;

let current = "";
try { current = readFileSync(TARGET, "utf8"); } catch {}

if (current === expected) {
  console.log("✓ hub-sdk in sync");
  process.exit(0);
}

if (check) {
  console.error("✗ packages/hub-sdk/sdk.ts is out of sync with src/lib/hub/sdk.ts");
  console.error("  Run: node scripts/sync-hub-sdk.mjs");
  process.exit(1);
}

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, expected);
console.log("✓ wrote packages/hub-sdk/sdk.ts");
