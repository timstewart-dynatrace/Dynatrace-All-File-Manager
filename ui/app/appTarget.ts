import type { AppFeature } from "./types/appFeature";

/**
 * Combined-app default: all features enabled.
 * Single-feature deploy targets overwrite this file with one of the
 * appTarget.<feature>.ts variants via scripts/with-target.mjs, then
 * restore this file afterward. Never edit the variants' import path —
 * they must import AppFeature from ./types/appFeature, not ./appTarget,
 * since this file itself is the swap target.
 */
export const ENABLED_FEATURES: AppFeature[] = [
  "notebooks",
  "dashboards",
  "lookup",
  "documents",
];
