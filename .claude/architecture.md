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
│   │   ├── App.tsx                   # Main app with routing
│   │   ├── constants.ts              # App constants (APP_VERSION)
│   │   ├── components/
│   │   │   ├── Card.tsx              # Reusable card component
│   │   │   └── Header.tsx            # Navigation header
│   │   └── pages/
│   │       ├── Home.tsx              # Landing page (displays version)
│   │       ├── NotebookManager.tsx   # Notebook management page
│   │       ├── DashboardManager.tsx  # Dashboard management page
│   │       ├── LookupFileManager.tsx # Lookup table management page
│   │       └── FileManager.tsx       # Document management page
│   ├── assets/                       # Images and icons (theme-aware)
│   │   ├── Dynatrace_Logo.svg       # App branding
│   │   ├── notebook.svg / notebook_dark.svg
│   │   ├── dashboard.svg / dashboard_dark.svg
│   │   ├── lookup.svg / lookup_dark.svg
│   │   └── document.svg / document_dark.svg
│   └── main.tsx                      # React entry point
├── docs/                             # Documentation
│   └── USAGE.md                      # Usage guide
│   └── CHANGELOG.md                  # Version history
├── .claude/                          # Claude Code instructions
│   ├── CLAUDE.md                     # Main instructions
│   └── DECISIONS.md                  # Main stack decisions
│   └── architecture.md               # Main architecture
│   └── rules/                        # Modular instruction files
│   └── phases/                       # Implementations
├── app.config.json                   # Dynatrace app configuration
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
