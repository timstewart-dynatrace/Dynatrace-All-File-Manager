# CLAUDE.md

This file provides guidance for Claude Code when working with this repository.

**IMPORTANT: Keep this file up to date whenever you add new features, pages, API functions, or make significant changes to the project structure.**

## Project Overview

**ESA Utilities** is a Dynatrace App built with React and TypeScript using the Strato Design System. It provides utilities for Enterprise Solution Architects.

- **App ID:** `my.esa.utilities`
- **Version:** 0.10.8
- **Sprint Environment:** https://xzj8412h.sprint.apps.dynatracelabs.com/
- **Production Environment:** https://yhu28601.apps.dynatrace.com/

## Tech Stack

- React 18.3.1
- TypeScript 5.9.3
- React Router DOM 6.22.2
- Dynatrace Strato Design System
- Dynatrace App Toolkit (dt-app)
- Dynatrace SDKs (client-document, client-query, etc.)

## Dynatrace SDK Reference

**Always consult these resources when working with Dynatrace APIs:**

| Resource | URL |
|----------|-----|
| **SDK Overview** | https://developer.dynatrace.com/develop/sdks/ |
| **Document API SDK** | https://developer.dynatrace.com/develop/sdks/client-document/ |
| **App Settings v2 SDK** | https://developer.dynatrace.com/develop/sdks/client-app-settings-v2/ |
| **App Settings v2 (npm)** | https://www.npmjs.com/package/@dynatrace-sdk/client-app-settings-v2 |

### SDK Packages Used

- `@dynatrace-sdk/client-document` - Document API for notebooks, dashboards
- `@dynatrace-sdk/client-query` - DQL query execution
- `@dynatrace-sdk/app-environment` - App environment info (`getCurrentUserDetails()`, `getEnvironmentUrl()`)
- `@dynatrace-sdk/react-hooks` - React hooks for SDK functions

## Project Structure

```
esa-utilities/
├── api/                              # Serverless functions (backend)
│   ├── notebooks.function.ts         # Create notebook
│   ├── notebooksDelete.function.ts   # Delete notebook
│   ├── notebooksGet.function.ts      # Get notebook by ID (metadata + content)
│   ├── notebooksList.function.ts     # List notebooks with security info
│   ├── notebooksUpdate.function.ts   # Update notebook visibility
│   ├── dashboards.function.ts        # Create dashboard
│   ├── dashboardsDelete.function.ts  # Delete dashboard
│   ├── dashboardsGet.function.ts     # Get dashboard by ID (metadata + content)
│   ├── dashboardsList.function.ts    # List dashboards with security info
│   └── dashboardsUpdate.function.ts  # Update dashboard visibility
├── ui/
│   ├── app/
│   │   ├── App.tsx                   # Main app with routing
│   │   ├── constants.ts              # App constants (APP_VERSION)
│   │   ├── components/
│   │   │   ├── Card.tsx              # Reusable card component
│   │   │   └── Header.tsx            # Navigation header
│   │   └── pages/
│   │       ├── Home.tsx              # Landing page (displays version)
│   │       ├── Data.tsx              # Data exploration page
│   │       ├── NotebookManager.tsx   # Notebook management page
│   │       └── DashboardManager.tsx  # Dashboard management page
│   ├── assets/                       # Images and icons (theme-aware)
│   │   ├── notebook.svg / notebook_dark.svg
│   │   └── dashboard.svg / dashboard_dark.svg
│   └── main.tsx                      # React entry point
├── app.config.json                   # Dynatrace app configuration
├── package.json                      # Dependencies and scripts
├── CLAUDE.md                         # This file - KEEP UP TO DATE
└── eslint.config.mjs                 # ESLint with security plugins
```

## Common Commands

```bash
npm run start      # Dev server with hot reload
npm run build      # Build for production
npm run lint       # Run ESLint
npm run deploy     # Build and deploy to Dynatrace
npm run info       # Show CLI and environment info
```

## Development Workflow

1. **Before deploying:** Always bump version in `app.config.json` AND `ui/app/constants.ts`
2. **Adding a new page:**
   - Create component in `ui/app/pages/`
   - Add route in `App.tsx`
   - Add nav item in `Header.tsx`
   - Optionally add card on `Home.tsx` with theme-aware icons
3. **Adding API functions:**
   - Create `api/<name>.function.ts`
   - Call via `fetch('/api/<name>', { method: 'POST', body: JSON.stringify(payload) })`
4. **Assets:** Use SVG for icons. Create both light and dark variants (e.g., `icon.svg`, `icon_dark.svg`)
5. **Update CLAUDE.md:** When adding features, pages, or API functions, update this file

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Landing page with navigation cards |
| `/data` | Data | Data exploration |
| `/notebook-manager` | NotebookManager | Bulk notebook management |
| `/dashboard-manager` | DashboardManager | Bulk dashboard management |

## OAuth Scopes

Configured in `app.config.json`:
- `storage:logs:read` - Read log data
- `storage:buckets:read` - Read bucket data
- `document:documents:read` - Read notebooks/dashboards via Document API
- `document:documents:write` - Create/update notebooks/dashboards via Document API
- `document:documents:delete` - Delete notebooks/dashboards via Document API

## API Functions

### Notebook APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notebooksList` | POST | List all notebooks with pagination and security info |
| `/api/notebooksGet` | POST | Get notebook by ID (metadata + content combined) |
| `/api/notebooks` | POST | Create a new notebook |
| `/api/notebooksDelete` | POST | Delete notebook by ID |
| `/api/notebooksUpdate` | POST | Update notebook visibility (isPrivate) |

### Dashboard APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboardsList` | POST | List all dashboards with pagination and security info |
| `/api/dashboardsGet` | POST | Get dashboard by ID (metadata + content combined) |
| `/api/dashboards` | POST | Create a new dashboard |
| `/api/dashboardsDelete` | POST | Delete dashboard by ID |
| `/api/dashboardsUpdate` | POST | Update dashboard visibility (isPrivate) |

### Document API Notes

- Use `documentsClient.listDocuments()` for listing with filters (e.g., `type=='notebook'` or `type=='dashboard'`)
- Use `documentsClient.downloadDocumentContent()` to get actual document content as Binary
- Binary content: use `await binaryContent.get("text")` then `JSON.parse()` to get JSON content
- For export: combine metadata from `listDocuments` with content from `downloadDocumentContent`

## Notebook Manager Features

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

**Note:** Only document owners can change visibility or delete documents.

## Dashboard Manager Features

The Dashboard Manager page provides identical functionality to Notebook Manager but for dashboards:

- All features mirror Notebook Manager
- Uses `type=='dashboard'` filter for Document API
- Links open dashboards in `dynatrace.dashboards` app using `getEnvironmentUrl()`

## Link Generation

**IMPORTANT:** Never hardcode environment URLs. Use `getEnvironmentUrl()` from `@dynatrace-sdk/app-environment`:

```typescript
import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";

// Correct - dynamic URL
href={`${getEnvironmentUrl()}/ui/apps/dynatrace.notebooks/notebook/${id}`}

// Wrong - hardcoded URL
href={`https://xzj8412h.sprint.apps.dynatracelabs.com/ui/apps/dynatrace.notebooks/notebook/${id}`}
```

## Linting Notes

- ESLint includes security plugins (no-secrets, security, no-unsanitized, @microsoft/sdl)
- Warning about React version can be ignored or fixed by adding `settings: { react: { version: 'detect' } }` to eslint config
- Node.js 22 is recommended for dt-app CLI

## Deployment

**IMPORTANT:** Before each deploy, update the version in TWO places:
1. `app.config.json` - `"version": "x.y.z"`
2. `ui/app/constants.ts` - `APP_VERSION = "x.y.z"`

The version is displayed on the Home page footer.

**Environment Configuration:**
- Change `environmentUrl` in `app.config.json` before deploying to different environments
- Sprint: `https://xzj8412h.sprint.apps.dynatracelabs.com/`
- Production: `https://yhu28601.apps.dynatrace.com/`

```bash
npm run deploy
```

## Maintenance

**KEEP THIS FILE UPDATED** when you:
- Add new pages or routes
- Add new API functions
- Change project structure
- Add new features
- Update version numbers
- Change environment configurations
