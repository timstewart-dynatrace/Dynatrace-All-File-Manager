#!/usr/bin/env node
/**
 * Validates that app.config.json and ui/app/constants.ts report the same version.
 * Run via: npm run check:version
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const config = JSON.parse(readFileSync(join(root, "app.config.json"), "utf8"));
const configVersion = config.app?.version ?? config.version;

const constants = readFileSync(join(root, "ui/app/constants.ts"), "utf8");
const match = constants.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
const constantsVersion = match?.[1];

if (!configVersion) {
  console.error("ERROR: Could not read version from app.config.json");
  process.exit(1);
}

if (!constantsVersion) {
  console.error("ERROR: Could not read APP_VERSION from ui/app/constants.ts");
  process.exit(1);
}

if (configVersion !== constantsVersion) {
  console.error(`ERROR: Version mismatch detected!`);
  console.error(`  app.config.json:       ${configVersion}`);
  console.error(`  ui/app/constants.ts:   ${constantsVersion}`);
  console.error(`\nUpdate both files to the same version before deploying.`);
  process.exit(1);
}

console.log(`✓ Version sync OK: ${configVersion}`);
