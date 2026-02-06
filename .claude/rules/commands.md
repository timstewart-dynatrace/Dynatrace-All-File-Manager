# API Commands Reference

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Notebook APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notebooksList` | POST | List all notebooks with pagination and security info |
| `/api/notebooksGet` | POST | Get notebook by ID (metadata + content combined) |
| `/api/notebooks` | POST | Create a new notebook |
| `/api/notebooksDelete` | POST | Delete notebook by ID |
| `/api/notebooksUpdate` | POST | Update notebook visibility (isPrivate) |
| `/api/notebooksShare` | POST | Create environment share link for notebook |
| `/api/notebooksShareList` | POST | List all environment shares for notebooks |

## Dashboard APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboardsList` | POST | List all dashboards with pagination and security info |
| `/api/dashboardsGet` | POST | Get dashboard by ID (metadata + content combined) |
| `/api/dashboards` | POST | Create a new dashboard |
| `/api/dashboardsDelete` | POST | Delete dashboard by ID |
| `/api/dashboardsUpdate` | POST | Update dashboard visibility (isPrivate) |
| `/api/dashboardsShare` | POST | Create environment share link for dashboard |
| `/api/dashboardsShareList` | POST | List all environment shares for dashboards |

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

## CLI Commands

```bash
npm run start              # Dev server with hot reload
npm run build              # Build for production
npm run lint               # Run ESLint
npm run deploy             # Build and deploy to Dynatrace
npm run info               # Show CLI and environment info
npm run generate:function  # Generate new serverless function
npm run update             # Update @dynatrace-scoped packages
npm run uninstall          # Uninstall app from environment
npm run help               # Show Dynatrace App Toolkit help
```
