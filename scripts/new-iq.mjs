#!/usr/bin/env node
/**
 * Scaffold a new IQ inside the Hub repo.
 *
 * Usage:
 *   node scripts/new-iq.mjs <key> "<Display Name>" [--prefix=<gem_prefix>]
 *
 * Example:
 *   node scripts/new-iq.mjs supplychainiq "SupplyChainIQ" --prefix=gem_scm
 *
 * What it does (all edits scoped to this repo):
 *   1. Writes src/lib/hub/assessments/<key>.ts  (spec skeleton with placeholder fields).
 *   2. Adds the import + registry entry in     src/lib/hub/assessments/index.ts
 *   3. Adds a manifest entry in                src/lib/hub/manifest.json
 *      and bumps its patch version.
 *   4. Runs the SDK/manifest sync so packages/hub-sdk/manifest.json matches.
 *
 * After running:
 *   - Edit src/lib/hub/assessments/<key>.ts to declare the real fields.
 *   - POST /api/public/admin/bootstrap-hubspot-schema with x-job-secret to
 *     create the new gem_<prefix>_* HubSpot properties.
 *   - Publish. Every IQ picks up the new manifest on next build + within
 *     5 min at runtime via hub.manifest.watch().
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/new-iq.mjs <key> "<Display Name>" [--prefix=<gem_prefix>]');
  process.exit(1);
}
const key = args[0].trim().toLowerCase();
const displayName = args[1].trim();
const prefixArg = args.find((a) => a.startsWith("--prefix="));
const prefix = (prefixArg ? prefixArg.split("=")[1] : `gem_${key.replace(/iq$/, "")}`).toLowerCase();

if (!/^[a-z][a-z0-9]+$/.test(key)) {
  console.error(`✗ key must be lowercase alphanumeric (got "${key}")`);
  process.exit(1);
}
if (!/^gem_[a-z][a-z0-9_]*$/.test(prefix)) {
  console.error(`✗ prefix must match gem_<snake> (got "${prefix}")`);
  process.exit(1);
}

const specPath = resolve(root, `src/lib/hub/assessments/${key}.ts`);
const indexPath = resolve(root, "src/lib/hub/assessments/index.ts");
const manifestPath = resolve(root, "src/lib/hub/manifest.json");

if (existsSync(specPath)) {
  console.error(`✗ ${specPath} already exists — refusing to overwrite.`);
  process.exit(1);
}

// 1. Spec file
const spec = `import type { AssessmentSpec, SubmissionForMapping } from "./types";

/** ${displayName} spec — PLACEHOLDER. Replace fields with the real ones,
 *  then POST /api/public/admin/bootstrap-hubspot-schema to create the
 *  gem_<prefix>_* HubSpot properties. */
const prefix = "${prefix}";

export const ${key}: AssessmentSpec = {
  key: "${key}",
  displayName: "${displayName}",
  contactProperties: [
    { name: \`\${prefix}_score\`, label: "GEM ${displayName} Score", type: "number" },
    { name: \`\${prefix}_tier\`,  label: "GEM ${displayName} Tier",  type: "enum",
      options: [
        { label: "At risk",    value: "at_risk" },
        { label: "Developing", value: "developing" },
        { label: "Optimized",  value: "optimized" },
      ] },
    { name: \`\${prefix}_completed_at\`, label: "GEM ${displayName} Completed At", type: "date" },
  ],
  toContactProperties: (s: SubmissionForMapping) => ({
    [\`\${prefix}_score\`]: s.score,
    [\`\${prefix}_tier\`]: s.tier?.toLowerCase() ?? null,
    [\`\${prefix}_completed_at\`]: s.submitted_at.slice(0, 10),
    ...flattenDimensions(prefix, s.dimensions),
  }),
};

function flattenDimensions(pfx: string, dims: Record<string, unknown> | null | undefined) {
  const out: Record<string, string | number | null> = {};
  if (!dims) return out;
  for (const [k, v] of Object.entries(dims)) {
    if (v == null) continue;
    if (typeof v !== "number" && typeof v !== "string") continue;
    const name = \`\${pfx}_\${k}\`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    out[name] = v;
  }
  return out;
}
`;
writeFileSync(specPath, spec);
console.log(`✓ wrote ${specPath}`);

// 2. Registry
let idx = readFileSync(indexPath, "utf8");
if (idx.includes(`from "./${key}"`)) {
  console.log(`✓ registry already imports ${key}`);
} else {
  idx = idx.replace(
    /(import \{ techservicesiq \} from "\.\/techservicesiq";)/,
    `$1\nimport { ${key} } from "./${key}";`,
  );
  idx = idx.replace(
    /(techservicesiq,\n\];)/,
    `techservicesiq,\n  ${key},\n];`,
  );
  writeFileSync(indexPath, idx);
  console.log(`✓ registered ${key} in ${indexPath}`);
}

// 3. Manifest
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const already = manifest.assessments.find((a) => a.key === key);
if (!already) {
  manifest.assessments.push({
    key,
    name: displayName,
    url: `https://${key}.globaledgemarkets.com`,
  });
}
// bump patch
const [maj, min, patch] = String(manifest.version).split(".").map((n) => parseInt(n, 10) || 0);
manifest.version = `${maj}.${min}.${patch + 1}`;
manifest.updated_at = new Date().toISOString().slice(0, 10);
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✓ manifest bumped → v${manifest.version}`);

// 4. Sync package copy
const sync = spawnSync("node", ["scripts/sync-hub-sdk.mjs"], { cwd: root, stdio: "inherit" });
if (sync.status !== 0) process.exit(sync.status ?? 1);

console.log(`
Next steps:
  1. Edit src/lib/hub/assessments/${key}.ts with the real fields.
  2. POST https://gemiq.globaledgemarkets.com/api/public/admin/bootstrap-hubspot-schema
     with header x-job-secret: <JOB_SECRET>  (idempotent; creates gem_* props).
  3. Publish the Hub. IQ apps pick up manifest v${manifest.version} on next
     build (via pull-hub-sdk.mjs) and within 5 min at runtime (hub.manifest.watch).
  4. Scaffold the IQ codebase itself with:
       curl -sSL https://raw.githubusercontent.com/GlobalEdgeMarkets/gemiq-unified-hub/main/scripts/hub-init.mjs | node
`);
