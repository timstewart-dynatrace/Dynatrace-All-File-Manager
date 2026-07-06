# Architecture

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Project Structure

```
dt-file-manager/
├── api/                              # Serverless functions (backend)
│   ├── notebooks.function.ts         # Create notebook
│   ├── notebooksDelete.function.ts   # Delete notebook
│   ├── notebooksGet.function.ts      # Get notebook by ID (metadata + content)
│   ├── notebooksList.function.ts     # List notebooks with security info
│   ├── notebooksUpdate.function.ts   # Update notebook visibility
│   ├── notebooksShare.function.ts    # Create share link for notebook
│   ├── notebooksShareList.function.ts # List notebook shares
│   ├── dashboards.function.ts        # Create dashboard
│   ├── dashboardsDelete.function.ts  # Delete dashboard
│   ├── dashboardsGet.function.ts     # Get dashboard by ID (metadata + content)
│   ├── dashboardsList.function.ts    # List dashboards with security info
│   ├── dashboardsUpdate.function.ts  # Update dashboard visibility
│   ├── dashboardsShare.function.ts   # Create share link for dashboard
│   ├── dashboardsShareList.function.ts # List dashboard shares
│   ├── files.function.ts             # Create document
│   ├── filesDelete.function.ts       # Delete document
│   ├── filesGet.function.ts          # Get document by ID (metadata + content)
│   ├── filesList.function.ts         # List documents with security info
│   ├── filesUpdate.function.ts       # Update document visibility
│   ├── filesShare.function.ts        # Create share link for document
│   ├── filesShareList.function.ts    # List document shares
│   ├── listLookupFiles.function.ts   # List lookup files from Grail
│   ├── uploadLookupFile.function.ts  # Upload file to Grail
│   ├── deleteLookupFile.function.ts  # Delete lookup file from Grail
│   └── getLookupFileContent.function.ts # Download lookup file content
├── ui/
│   ├── app/
│   │   ├── App.tsx                   # Main app with routing (filtered by ENABLED_FEATURES)
│   │   ├── constants.ts              # App constants (APP_VERSION)
│   │   ├── appTarget.ts              # Combined-app feature flag (all 4 enabled) — swap target
│   │   ├── appTarget.notebooks.ts    # Single-feature variant: notebooks only
│   │   ├── appTarget.dashboards.ts   # Single-feature variant: dashboards only
│   │   ├── appTarget.lookup.ts       # Single-feature variant: lookup only
│   │   ├── appTarget.documents.ts    # Single-feature variant: documents only
│   │   ├── features.ts               # Feature registry: route paths, nav labels, card icons
│   │   ├── types/
│   │   │   └── appFeature.ts         # AppFeature type (not swapped — shared by all appTarget*.ts)
│   │   ├── components/
│   │   │   ├── Card.tsx              # Reusable card component
│   │   │   ├── Header.tsx            # Navigation header (filters items by ENABLED_FEATURES)
│   │   │   └── DocumentManager.tsx   # Shared manager component (config-driven)
│   │   ├── utils/
│   │   │   ├── csv.ts                # escapeCSVField, recordsToCSV
│   │   │   ├── document.ts           # looksLikeLaunchpad, nameFromFile
│   │   │   └── __tests__/            # Unit tests for the above
│   │   └── pages/
│   │       ├── Home.tsx              # Landing page (cards filtered by ENABLED_FEATURES)
│   │       ├── NotebookManager.tsx   # Thin wrapper around DocumentManager
│   │       ├── DashboardManager.tsx  # Thin wrapper around DocumentManager
│   │       ├── LookupFileManager.tsx # Lookup table management page
│   │       └── FileManager.tsx       # Document management page
│   ├── assets/                       # Images and icons (theme-aware)
│   │   ├── Dynatrace_Logo.svg       # App branding
│   │   ├── notebook.svg / notebook_dark.svg
│   │   ├── dashboard.svg / dashboard_dark.svg
│   │   ├── lookup.svg / lookup_dark.svg
│   │   └── document.svg / document_dark.svg
│   └── main.tsx                      # React entry point
├── scripts/
│   ├── check-version-sync.mjs        # Validates app.config.json / constants.ts versions match
│   └── with-target.mjs               # Swaps in a single-feature config, runs a command, restores
├── docs/                             # Documentation
│   └── USAGE.md                      # Usage guide
│   └── CHANGELOG.md                  # Version history
├── .claude/                          # Claude Code instructions
│   ├── CLAUDE.md                     # Main instructions
│   └── DECISIONS.md                  # Main stack decisions
│   └── architecture.md               # Main architecture
│   └── rules/                        # Modular instruction files
│   └── phases/                       # Implementations
├── app.config.json                   # Dynatrace app configuration (combined app)
├── app.config.notebooks.json         # Standalone Notebook Manager app config
├── app.config.dashboards.json        # Standalone Dashboard Manager app config
├── app.config.lookup.json            # Standalone Lookup Table Manager app config
├── app.config.documents.json         # Standalone Document Manager app config
├── package.json                      # Dependencies and scripts
├── README.md                         # Project overview
├── CLAUDE.md                         # Points to .claude/CLAUDE.md
└── eslint.config.mjs                 # ESLint with security plugins
```

## Tech Stack

- React 18.3.1
- TypeScript 5.9.3
- React Router DOM 6.22.2
- Dynatrace Strato Design System
- Dynatrace App Toolkit (dt-app)
- Dynatrace SDKs (client-document, client-query, etc.)

## SDK Packages Used

- `@dynatrace-sdk/client-document` - Document API for notebooks, dashboards
- `@dynatrace-sdk/client-query` - DQL query execution
- `@dynatrace-sdk/app-environment` - App environment info (`getCurrentUserDetails()`, `getEnvironmentUrl()`)
- `@dynatrace-sdk/react-hooks` - React hooks for SDK functions

## OAuth Scopes

Configured in `app.config.json`. All scopes are actively used — no unused template scopes remain.

| Scope | Used by |
|-------|---------|
| `document:documents:read` | All list/export operations across Notebooks, Dashboards, Documents |
| `document:documents:write` | Upload and visibility toggle across Notebooks, Dashboards, Documents |
| `document:documents:delete` | Delete operations across Notebooks, Dashboards, Documents |
| `document:environment-shares:read` | Share URL display in all document managers |
| `document:environment-shares:write` | Share link generation in all document managers |
| `document:environment-shares:delete` | Share link revocation (reserved, not yet exposed in UI) |
| `storage:files:read` | Browse and download in Lookup File Manager |
| `storage:files:write` | Upload in Lookup File Manager |
| `storage:files:delete` | Delete in Lookup File Manager |

Standalone single-feature apps (see below) request only the scopes their one feature needs — not this full list.

## Deployment Targets

This codebase can be deployed as the combined app (all 4 tabs) or as one of four standalone single-feature apps, coexisting in the same Dynatrace environment. Same source, same API functions — only `app.config.json` and `ui/app/appTarget.ts` differ per target.

| Target | Command | App ID | Scopes requested |
|--------|---------|--------|-------------------|
| Combined (default) | `npm run deploy` | `my.dt.file.manager` | All 9 scopes above |
| Notebooks only | `npm run deploy:notebooks` | `my.dt.notebook.manager` | `document:documents:*`, `document:environment-shares:*` |
| Dashboards only | `npm run deploy:dashboards` | `my.dt.dashboard.manager` | `document:documents:*`, `document:environment-shares:*` |
| Lookup Tables only | `npm run deploy:lookup` | `my.dt.lookup.manager` | `storage:files:*` |
| Documents only | `npm run deploy:documents` | `my.dt.document.manager` | `document:documents:*`, `document:environment-shares:*` |

Local preview for a single-feature build: `npm run start:notebooks` (and `start:dashboards`, `start:lookup`, `start:documents`).

**How it works:** `scripts/with-target.mjs <target> <command>` copies `app.config.<target>.json` over `app.config.json` and `ui/app/appTarget.<target>.ts` over `ui/app/appTarget.ts`, runs `<command>`, then restores both originals — on success, failure, or Ctrl+C. `ui/app/features.ts` reads `ENABLED_FEATURES` from `appTarget.ts` and is the single source of truth `App.tsx`, `Header.tsx`, and `Home.tsx` all filter against. When exactly one feature is enabled, `/` redirects straight to that manager instead of showing Home.

**Adding a fifth target:** create `app.config.<name>.json` (new `app.id`/name/icon/scopes) and `ui/app/appTarget.<name>.ts` (one-line `ENABLED_FEATURES` array), then add `deploy:<name>` / `start:<name>` npm scripts following the existing pattern. No changes needed to `App.tsx`, `Header.tsx`, `Home.tsx`, or `features.ts` unless the new target needs a route that doesn't already exist in `FEATURE_REGISTRY`.

See the "Standalone Single-Feature Apps via Config Swap" entry in `.claude/DECISIONS.md` (2026-07-06) for why this approach was chosen over separate repos.

## Components

### Notebook Manager Features

The Notebook Manager page provides bulk operations for Dynatrace notebooks:

- **Bulk Upload** - Upload multiple notebook JSON files at once
- **Export Selected** - Download selected notebooks as JSON files (metadata + content)
- **Make Private** - Set selected notebooks to private (isPrivate: true)
- **Make Public** - Set selected notebooks to public (isPrivate: false) - shows warning color
- **Delete Selected** - Bulk delete notebooks with confirmation
- **Visibility Column** - Shows PUBLIC (warning) or Private (success) badge
- **Sortable Columns** - Click column headers to sort by name, owner, dates, or visibility
- **Filter** - Search notebooks by name or owner
- **Ownership Awareness** - Checkboxes always enabled, but modify/delete buttons disabled when non-owned items selected
- **Generate Share Links** - Create shareable URLs for selected notebooks (owners only)
- **Show Share URLs Toggle** - Display share URL column with copy-to-clipboard functionality

**Note:** Only document owners can change visibility, delete documents, or create share links.

### Dashboard Manager Features

The Dashboard Manager page provides identical functionality to Notebook Manager but for dashboards:

- All features mirror Notebook Manager (including share link generation)
- Uses `type=='dashboard'` filter for Document API
- Links open dashboards in `dynatrace.dashboards` app using `getEnvironmentUrl()`

### Document Manager (FileManager) Features

The Document Manager page provides management for all document types except notebooks, dashboards, and launchpads:

- **Single Upload** - Upload individual files with metadata form (wraps non-conforming files as rawText)
- **Bulk Upload** - Upload multiple files with format validation (requires name and type fields)
- **Viewer Modal** - View owned documents showing rawText content
- **Visibility Control** - Toggle public/private visibility
- **Share Links** - Generate shareable URLs for owned documents
- **Delete Selected** - Bulk delete with confirmation
- **Filter & Sort** - Search and sort documents

### Lookup File Manager Features

The Lookup File Manager page provides bulk operations for lookup files stored in Dynatrace Grail:

- **Browse Files** - View all lookup files with metadata (size, record count, owner, modified date)
- **Upload Files** - Upload CSV, JSON, JSONL, and XML files (max 100 MB)
- **Download Files** - Download selected lookup files as CSV
- **Delete Files** - Bulk delete lookup files with confirmation (owners only)
- **Ownership Awareness** - Delete button disabled when non-owned items selected; download always available
- **Filter** - Search files by name
- **Sort** - Sort by name, size, modified time, or record count
- **Select/Deselect** - Bulk selection of multiple files

**Supported file formats:** CSV, JSON, JSONL, XML

**Note:** Files are stored in the `/lookups/` directory in Grail's resource store.

## Key Patterns

### Environment Shares

The app uses `environmentSharesClient` from `@dynatrace-sdk/client-document` to create shareable URLs.

**Key points:**

- Only document owners can create shares
- Users must "claim" a share to get access
- One share per access type per document (one read, one read-write max)
- Deleting a share revokes access from all claimers

### Ownership Model

All four manager tabs enforce the same ownership rule: **only download/export is available for items the user does not own.** Modify, delete, visibility, and share actions require ownership.

- Notebooks, Dashboards, Documents: use `owner` field compared to `getCurrentUserDetails().id`
- Lookup Files: use `ownerId` field compared to `getCurrentUserDetails().id`

### Document API Notes

- Use `documentsClient.listDocuments()` for listing with filters (e.g., `type=='notebook'` or `type=='dashboard'`)
- Use `documentsClient.downloadDocumentContent()` to get actual document content as Binary
- Binary content: use `await binaryContent.get("text")` then `JSON.parse()` to get JSON content
- For export: combine metadata from `listDocuments` with content from `downloadDocumentContent`
