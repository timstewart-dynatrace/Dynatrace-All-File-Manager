# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

### Added
- Standalone single-feature deploy targets: `npm run deploy:notebooks`, `deploy:dashboards`, `deploy:lookup`, `deploy:documents` (and matching `start:*` for local preview). Each deploys as its own Dynatrace app (`my.dt.notebook.manager`, etc.) coexisting alongside the combined app, requesting only the OAuth scopes its one feature needs. Implemented via a build-time feature flag (`ui/app/appTarget.ts`) and a config-swap script (`scripts/with-target.mjs`) — no code duplication, same source for all five deploy targets.
- Unit tests (`npm test`, Node's built-in test runner + `tsx`, no external framework) covering `escapeCSVField`/`recordsToCSV` (`ui/app/utils/csv.ts`) and `looksLikeLaunchpad`/`nameFromFile` (`ui/app/utils/document.ts`), extracted from `getLookupFileContent.function.ts` and `FileManager.tsx` respectively.
- `scripts/check-version-sync.mjs`, wired as a `predeploy` hook, fails the deploy if `app.config.json` and `ui/app/constants.ts` report different versions.
- Permissions documentation (README.md, docs/USAGE.md) mapping each OAuth scope to the features it unlocks, plus the minimum scope set for read-only use.

### Changed
- Upgraded all dependencies to latest, including three major versions previously held back (see 0.4.2 note below, now resolved): React 18 → 19, TypeScript 5.9 → 6, ESLint 9 → 10. Also `@dynatrace-sdk/client-classic-environment-v2` 5 → 6, `react-intl` 6 → 10, `@react-three/fiber` 8 → 9, `@react-three/drei` 9 → 10, and all `@dynatrace/strato-*`/`@dynatrace-sdk/*` packages to latest minor. Required updating both tsconfigs' `moduleResolution` from `node` to `bundler` and removing the deprecated `baseUrl` option (TypeScript 6 requirement). `tsx` intentionally held at v3 — v4 requires Node 18+.
- `NotebookManager.tsx` and `DashboardManager.tsx` (previously ~1,400 lines each, ~90% duplicated) are now thin ~16-line wrappers around a new shared `components/DocumentManager.tsx`.
- All Lookup File API functions (`listLookupFiles`, `uploadLookupFile`, `deleteLookupFile`, `getLookupFileContent`) now return the same `{ statusCode, body }` envelope as the Document API functions, instead of a bare `{ success, error }` shape.
- Removed two unused OAuth scopes (`storage:logs:read`, `storage:buckets:read`) left over from the app template — not referenced by any API function.

### Fixed
- `files.function.ts`: a document created successfully but whose follow-up "make public" call failed now returns `207` instead of a misleading `200`.
- All delete/update API functions (notebooks, dashboards, files) now throw instead of silently passing an empty string as the optimistic-locking version when `getDocument` doesn't return one.
- `getLookupFileContent.function.ts`: downloads that hit the 100,000-record query limit now report `truncated: true` instead of silently returning an incomplete file.
- `uploadLookupFile.function.ts`: added path-traversal guard, a 10 MB content size limit, and an empty-content check.

## [0.5.4] - 2026-05-27

### Changed
- Redesigned app icon as a folder with five color-coded file tabs peeking out, one per managed type (notebook, dashboard, lookup, launchpad, document). Replaces the previous fanned-documents design which was hard to read at small sizes.

## [0.5.3] - 2026-05-27

### Added
- Custom app icon (`ui/assets/app-icon.svg`): three fanned documents on a Dynatrace purple-to-blue gradient, with content lines on the front document. Replaces the dt-app auto-generated "Dy" placeholder. Wired up via `app.icon` in `app.config.json`.

## [0.5.2] - 2026-05-27

### Fixed
- Uploads with Private unchecked now actually upload as public. `documentsClient.createDocument` ignores the `isPrivate` body field — documents are always created private. After create, the API now follows up with `updateDocument({isPrivate: false})` when the user requested public.

## [0.5.1] - 2026-05-27

### Added
- Launchpad shape auto-detection on upload: JSON files containing a `containerList.containers[]` are recognized as launchpads even without the document-API wrapper. Single upload marks them as conforming and auto-fills `type="launchpad"` plus `name` from the JSON or filename. Bulk upload synthesizes the wrapper before posting.

## [0.5.0] - 2026-05-27

### Added
- Document Manager now lists launchpads alongside other documents
- "Open ↗" link on launchpad rows that opens the launchpad in the Launcher app (`/ui/apps/dynatrace.launcher/launchpad/<id>`)
- Launchpad uploads supported via existing single and bulk upload flows (set `type: "launchpad"` in the JSON or in the single-upload form)

### Changed
- Updated Document Manager header copy to reflect launchpad inclusion

## [0.4.2] - 2026-05-27

### Changed
- Bumped dependencies to highest versions compatible with current peers (Strato 3.5, Dynatrace SDKs, three.js 0.184, react-router 7.15, dt-app 1.9, typescript-eslint 8.60, others)
- Migrated `Header.tsx` from deprecated `AppHeader.NavItems`/`NavItem`/`AppNavLink` to `AppHeader.Navigation`/`NavigationItem`/`Logo`

### Notes
- React 18, react-intl 6, TypeScript 5.9, @react-three/fiber 8, @react-three/drei 9, and ESLint 9 held back due to peer constraints from Strato, dt-app, and @microsoft/eslint-plugin-sdl

## [0.4.1] - 2026-04-01

### Fixed
- Sticky table headers now use zIndex to prevent row content from overlapping on scroll (all tabs)
- Lookup Tables: "View/Edit" button shows "View" for non-owned files
- Refresh button clears all result panels (delete, upload, update) across all tabs

## [0.4.0] - 2026-04-01

### Added
- Refresh button now clears all result panels (delete, upload, update) across all tabs
- Lookup Tables: "Edit Rows" button disabled for non-owned files
- Lookup Tables: button label shows "View" instead of "View/Edit" for non-owned files

## [0.3.0] - 2026-04-01

### Added
- Ownership-based access control on Lookup Tables tab (delete restricted to file owners)

### Changed
- Restructured `.claude/` instruction files with modular rules
- Updated all documentation files to reflect current app name, version, and features

## [0.2.0] - 2026-03-25

### Added
- Document Manager page for managing all document types (except notebooks, dashboards, launchpads)
- Single file upload with metadata form (wraps non-conforming files as rawText)
- Bulk upload with format validation (requires name and type fields)
- Viewer modal for owned documents showing rawText content
- Distinct SVG icons for Lookup Tables and Documents
- Lookup Tables card on home page

### Changed
- Renamed application to "Dynatrace All File Manager"
- Renamed tabs to plural without "Manager": Notebooks, Dashboards, Lookup Tables, Documents
- Upload API now strips metadata fields from document content to preserve original files

## [0.1.0] - 2026-03-24

### Changed
- Renamed application from "ESA Document Management" to "DT File Manager"
- New app ID: `my.dt.file.manager` (registered as a new app)
- Reset version to 0.1.0

### Added
- Delete confirmation results panel showing ID and message for each deleted record
- Notebook Manager with bulk operations (upload, export, visibility control, sharing)
- Dashboard Manager with bulk operations (upload, export, visibility control, sharing)
- Lookup File Manager for Grail file operations (upload, download, delete)
