# Copilot instructions for DT File Manager

## Big picture
- Dynatrace App Toolkit project: React/TypeScript UI in `ui/` + serverless App Functions in `api/`.
- UI uses React Router; routes live in `ui/app/App.tsx` and page components in `ui/app/pages/`.
- Backend functions wrap Dynatrace SDKs: Document API for notebooks/dashboards and Grail resource store for lookup files.
- Workspace also contains `lookup-file-manager/` (independent project with identical SDK patterns).

## Architecture & data flow

### Frontend-Backend Communication
- App Functions in `api/` are invoked at `/api/<function-name>` endpoint
- UI calls backend: `fetch('/api/<name>', { method: 'POST', body: JSON.stringify(payload) })`
- All functions return `{ statusCode, body: {...} }` format

### Core SDK patterns (use these examples)

**Document API (notebooks/dashboards):**
```typescript
import { documentsClient } from "@dynatrace-sdk/client-document";

// List with filtering
const docs = await documentsClient.listDocuments({
  filter: `type=='notebook'`,  // or type=='dashboard'
  skip: 0,
  take: 50
});

// Fetch content separately (always a separate call)
const content = await documentsClient.downloadDocumentContent({ documentId });
const jsonContent = JSON.parse(await content.get("text"));  // NOT .text()!

// Create shares (owners only)
import { environmentSharesClient } from "@dynatrace-sdk/client-document";
const share = await environmentSharesClient.createEnvironmentShare({
  body: { documentId: "...", access: "read" }
});
```

**Lookup files (Grail storage):**
- Stored under `/lookups/` in Grail resource store
- File paths validate: `/^\/[a-zA-Z0-9\-_.\/]+[a-zA-Z0-9]$/`
- Upload as multipart FormData with `content` (blob) + `request` (JSON params)

**Environment URLs - CRITICAL:**
```typescript
import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";

// Correct - dynamically resolved
href={`${getEnvironmentUrl()}/ui/apps/dynatrace.notebooks/notebook/${id}`}

// Wrong - never hardcode
href="https://xzj8412h.sprint.apps.dynatracelabs.com/..."
```

## Routes & pages
Defined in `ui/app/App.tsx`, nav in `Header.tsx`:

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Home | Navigation with feature cards + version footer |
| `/notebook-manager` | NotebookManager | Bulk upload, export, delete, share notebooks |
| `/dashboard-manager` | DashboardManager | Bulk upload, export, delete, share dashboards |
| `/lookup-file-manager` | LookupFileManager | Manage lookup files in Grail |

## Development workflow

Prefer GitKraken MCP tools for git tasks.

```bash
npm run start      # Dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint (includes security plugins: SDL, no-secrets, no-unsanitized)
npm run deploy     # Build + deploy to environment in app.config.json
npm run generate:function  # Scaffold new App Function
```

**Before deploying:** Update version in BOTH places:
1. `app.config.json` → `"version": "x.y.z"`
2. `ui/app/constants.ts` → `APP_VERSION = "x.y.z"`
(Version displays on Home page footer)

## OAuth scopes (app.config.json)
- `document:documents:read/write/delete` - Notebook/dashboard CRUD
- `document:environment-shares:read/write/delete` - Shareable links
- `storage:logs:read` - Log data queries
- `storage:buckets:read` - Bucket metadata
- `storage:files:*` - Lookup file operations (upload/delete/read)

**Ownership checks:** Only document owners can delete, change visibility, or share. Disable modify/delete buttons for non-owned items.

## Adding features checklist

1. Create page in `ui/app/pages/<FeatureName>.tsx`
2. Add route in `ui/app/App.tsx`
3. Add nav item in `ui/app/components/Header.tsx`
4. Optional: Add card on `Home.tsx` with theme-aware SVGs (`ui/assets/icon.svg` + `icon_dark.svg`)
5. If API needed: create `api/<name>.function.ts`
6. Update `CLAUDE.md` with routes/APIs/features
7. Run `npm run lint` to validate security
8. Test: `npm run start`
9. Bump version in both config files
10. Run `npm run deploy`

## Key files

| File | Purpose |
|------|---------|
| `ui/app/App.tsx` | Route definitions |
| `ui/app/constants.ts` | APP_VERSION (sync with app.config.json) |
| `ui/app/components/Header.tsx` | Navigation menu |
| `ui/app/pages/Home.tsx` | Home page + version footer |
| `api/*.function.ts` | Serverless backend functions |
| `app.config.json` | OAuth scopes, version, environment URLs |
| `CLAUDE.md` | Extended dev guide—**KEEP UP TO DATE** |
| `eslint.config.mjs` | Security plugins enabled |

## Common patterns

**API Function error handling:**
```typescript
export default async function (payload: any) {
  try {
    return { statusCode: 200, body: { result } };
  } catch (error) {
    return { statusCode: 500, body: { message: error.toString() } };
  }
}
```

**Theme-aware icons:** Light (`icon.svg`) + dark (`icon_dark.svg`) variants in `ui/assets/`

**Ownership awareness:** Check ownership before enabling modify/delete

## Environment configuration
Deployments via `app.config.json`:
- Sprint: `https://xzj8412h.sprint.apps.dynatracelabs.com/`
- Production: `https://yhu28601.apps.dynatrace.com/`
- Change `environmentUrl` before deploying to different environments