# Decisions

This file tracks all non-trivial technical decisions made during this project.
See `rules/common/decisions.md` for the logging format and rules.

---

## 2026-04-01 — Deferred: Actions Column with Viewer Modal on All Tabs

**Chosen:** Defer implementation — record as future enhancement
**Alternatives:** Implement now across Notebooks, Dashboards, and Documents tabs
**Why:** User decision: current functionality is sufficient. Feature would add an "Actions" column with View/View-Edit button opening a read-only modal showing raw JSON content, matching the pattern in Lookup Tables.
**Trade-offs:** Users cannot inspect raw document content inline for Notebooks/Dashboards (must use external DT app links). Documents tab viewer is currently owner-only via name click.
**Revisit if:** Users request inline content inspection, or when adding edit capabilities to document types beyond Lookup Tables.

---
