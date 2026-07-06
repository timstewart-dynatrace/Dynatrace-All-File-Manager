#!/usr/bin/env node
/**
 * Temporarily swaps in a single-feature app.config.json and appTarget.ts,
 * runs the given command, then restores the combined-app originals —
 * even if the command fails.
 *
 * Usage: node scripts/with-target.mjs <notebooks|dashboards|lookup|documents> <command...>
 * Example: node scripts/with-target.mjs notebooks npm run deploy
 */

import { existsSync, copyFileSync, unlinkSync } from "fs";
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VALID_TARGETS = ["notebooks", "dashboards", "lookup", "documents"];

const [, , target, ...cmdParts] = process.argv;

if (!target || !VALID_TARGETS.includes(target)) {
  console.error(`Usage: node scripts/with-target.mjs <${VALID_TARGETS.join("|")}> <command...>`);
  process.exit(1);
}

if (cmdParts.length === 0) {
  console.error("No command provided to run with the target config.");
  process.exit(1);
}

const swaps = [
  { real: join(root, "app.config.json"), variant: join(root, `app.config.${target}.json`) },
  { real: join(root, "ui/app/appTarget.ts"), variant: join(root, `ui/app/appTarget.${target}.ts`) },
];

for (const { variant } of swaps) {
  if (!existsSync(variant)) {
    console.error(`Missing target file: ${variant}`);
    process.exit(1);
  }
}

const backupPath = (realPath) => `${realPath}.combined-backup`;

function backup() {
  for (const { real } of swaps) {
    copyFileSync(real, backupPath(real));
  }
}

function apply() {
  for (const { real, variant } of swaps) {
    copyFileSync(variant, real);
  }
}

function restore() {
  for (const { real } of swaps) {
    const backup = backupPath(real);
    if (existsSync(backup)) {
      copyFileSync(backup, real);
      unlinkSync(backup);
    }
  }
}

backup();
apply();
console.log(`[with-target] Applied '${target}' config. Running: ${cmdParts.join(" ")}`);

// Restore on Ctrl+C / kill too — spawnSync is synchronous, so an unhandled
// signal would terminate this process before the try/finally below runs.
let restored = false;
function restoreOnce() {
  if (restored) return;
  restored = true;
  restore();
  console.log("[with-target] Restored combined-app config.");
}
process.on("SIGINT", () => {
  restoreOnce();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restoreOnce();
  process.exit(143);
});

let result;
try {
  result = spawnSync(cmdParts[0], cmdParts.slice(1), {
    stdio: "inherit",
    shell: true,
    cwd: root,
    env: process.env,
  });
} finally {
  restoreOnce();
}

process.exit(result?.status ?? 1);
