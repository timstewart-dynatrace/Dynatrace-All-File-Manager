# API Commands Reference

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Notebook APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notebooksList` | POST | List all notebooks with pagination and security info |
| `/api/notebooksGet` | POST | Get notebook by ID (metadata + content combined) |
| `/api/notebooks` | POST | Create a new notebook |
| `/api/notebooksDelete` | POST | Delete notebook by ID |
| `/api/notebooksUpdate` | POST | Update notebook name and/or visibility (isPrivate) |
| `/api/notebooksShare` | POST | Create environment share link for notebook |
| `/api/notebooksShareList` | POST | List all environment shares for notebooks |

## Dashboard APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboardsList` | POST | List all dashboards with pagination and security info |
| `/api/dashboardsGet` | POST | Get dashboard by ID (metadata + content combined) |
| `/api/dashboards` | POST | Create a new dashboard |
| `/api/dashboardsDelete` | POST | Delete dashboard by ID |
| `/api/dashboardsUpdate` | POST | Update dashboard name and/or visibility (isPrivate) |
| `/api/dashboardsShare` | POST | Create environment share link for dashboard |
| `/api/dashboardsShareList` | POST | List all environment shares for dashboards |

## Document/File APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/filesList` | POST | List all documents with pagination and security info |
| `/api/filesGet` | POST | Get document by ID (metadata + content combined) |
| `/api/files` | POST | Create a new document |
| `/api/filesDelete` | POST | Delete document by ID |
| `/api/filesUpdate` | POST | Update document visibility (isPrivate) |
| `/api/filesShare` | POST | Create environment share link for document |
| `/api/filesShareList` | POST | List all environment shares for documents |

## Lookup File APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/listLookupFiles` | POST | List all lookup files from Grail |
| `/api/uploadLookupFile` | POST | Upload file to Grail |
| `/api/deleteLookupFile` | POST | Delete lookup file from Grail |
| `/api/getLookupFileContent` | POST | Download lookup file content |

## API Usage Pattern

Call APIs via fetch from the frontend:

```typescript
// Example: List notebooks
const response = await fetch('/api/notebooksList', {
  method: 'POST',
  body: JSON.stringify({ /* payload */ })
});
const data = await response.json();
```

**Response envelope:** every API function (including the Lookup File APIs, normalized to match) returns `{ statusCode: number, body: {...} }`. Always read the payload from `data.body`, not top-level fields — e.g. `data.body.files`, not `data.files`. This wasn't always consistent (the Lookup APIs used a bare `{ success, error }` shape before being normalized), so don't assume older reference code you find elsewhere in the git history reflects the current contract.

## CLI Commands

```bash
npm run start              # Dev server with hot reload (combined app)
npm run build               # Build for production
npm run lint                # Run ESLint
npm run test                 # Run unit tests
npm run check:version        # Verify app.config.json / constants.ts versions match
npm run deploy              # Build and deploy the combined app to Dynatrace
npm run deploy:notebooks    # Deploy standalone Notebook Manager app
npm run deploy:dashboards   # Deploy standalone Dashboard Manager app
npm run deploy:lookup       # Deploy standalone Lookup Table Manager app
npm run deploy:documents    # Deploy standalone Document Manager app
npm run start:notebooks     # Local preview of the standalone Notebook Manager build
npm run start:dashboards    # Local preview of the standalone Dashboard Manager build
npm run start:lookup        # Local preview of the standalone Lookup Table Manager build
npm run start:documents     # Local preview of the standalone Document Manager build
npm run info                # Show CLI and environment info
npm run generate:function   # Generate new serverless function
npm run update              # Update @dynatrace-scoped packages
npm run uninstall           # Uninstall app from environment
npm run help                # Show Dynatrace App Toolkit help
```
