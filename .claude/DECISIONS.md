# Decisions

This file tracks all non-trivial technical decisions made during this project.
See `rules/common/decisions.md` for the logging format and rules.

---

## 2026-07-06 — Standalone Single-Feature Apps via Config Swap, Not Separate Repos

**Chosen:** User decision: keep one codebase. Add a build-time feature flag (`ui/app/appTarget.ts`, swapped per target) plus four additional `app.config.<feature>.json` files, each with a unique `app.id`/name/reduced OAuth scopes. A new script (`scripts/with-target.mjs`) swaps the active `app.config.json` and `appTarget.ts` before running any `dt-app` command, then restores the combined-app originals afterward — including on failure or Ctrl+C.
**Alternatives:** (1) Separate repo per feature — rejected, multiplies maintenance to 5x for every bug fix and dependency bump. (2) Runtime feature flag read from an API/settings call — rejected, adds a network dependency and doesn't reduce the OAuth scopes requested at install time, which was a stated goal.
**Why:** The four standalone apps (Notebook, Dashboard, Lookup Table, Document Manager) must coexist in the same Dynatrace environment alongside the existing combined "Dynatrace All File Manager" app, each requesting only the scopes its one feature needs. Config must differ at *build/deploy* time (app.id, name, icon, scopes are static per Dynatrace app registration) — a runtime toggle can't change `app.config.json`.
**Trade-offs:** Deploying a single-feature app requires remembering to use `npm run deploy:<feature>` instead of `npm run deploy`. A crash mid-swap (outside the handled SIGINT/SIGTERM/try-finally paths, e.g. `kill -9`) could leave `app.config.json` in a single-feature state; the `.combined-backup` file would still be present as a recovery point in that case.
**Revisit if:** More than 4 standalone targets are needed and the per-target file duplication (4 config files + 4 appTarget variants) becomes unwieldy — at that point, generate the variants from a single manifest instead of hand-writing each one.

---

## 2026-04-01 — Deferred: Actions Column with Viewer Modal on All Tabs

**Chosen:** Defer implementation — record as future enhancement
**Alternatives:** Implement now across Notebooks, Dashboards, and Documents tabs
**Why:** User decision: current functionality is sufficient. Feature would add an "Actions" column with View/View-Edit button opening a read-only modal showing raw JSON content, matching the pattern in Lookup Tables.
**Trade-offs:** Users cannot inspect raw document content inline for Notebooks/Dashboards (must use external DT app links). Documents tab viewer is currently owner-only via name click.
**Revisit if:** Users request inline content inspection, or when adding edit capabilities to document types beyond Lookup Tables.

---
