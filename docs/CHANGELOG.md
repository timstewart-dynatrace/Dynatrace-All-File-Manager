# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## [Unreleased]

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
