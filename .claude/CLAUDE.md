# DT File Manager - Claude Code Instructions

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

**IMPORTANT: Keep this file up to date whenever you add new features, pages, API functions, or make significant changes to the project structure.**

## Project Overview

**DT File Manager** is a Dynatrace App built with React and TypeScript using the Strato Design System. It provides file management utilities for Dynatrace.

- **App ID:** `my.dt.file.manager`
- **Version:** 0.1.0
- **Sprint Environment:** https://xzj8412h.sprint.apps.dynatracelabs.com/
- **Production Environment:** https://yhu28601.apps.dynatrace.com/

## Modular Instructions

Detailed instructions are organized in the `rules/` directory:

- @.claude/rules/architecture.md - Project structure and components
- @.claude/rules/commands.md - API endpoints and commands
- @.claude/rules/development.md - Development workflow and tech stack

## Quick Reference

### Version Locations

**IMPORTANT:** Before each deploy, update the version in TWO places:

1. `app.config.json` - `"version": "x.y.z"`
2. `ui/app/constants.ts` - `APP_VERSION = "x.y.z"`

Both locations MUST have **matching** version numbers.

### Common Commands

```bash
npm run start      # Dev server with hot reload
npm run build      # Build for production
npm run lint       # Run ESLint
npm run deploy     # Build and deploy to Dynatrace
npm run info       # Show CLI and environment info
```

### Routes

| Path                   | Component         | Description                        |
| ---------------------- | ----------------- | ---------------------------------- |
| `/`                    | Home              | Landing page with navigation cards |
| `/notebook-manager`    | NotebookManager   | Bulk notebook management           |
| `/dashboard-manager`   | DashboardManager  | Bulk dashboard management          |
| `/lookup-file-manager` | LookupFileManager | Lookup file management in Grail    |

## Dynatrace SDK Reference

**Always consult these resources when working with Dynatrace APIs:**

| Resource                      | URL                                                                  |
| ----------------------------- | -------------------------------------------------------------------- |
| **SDK Overview**              | https://developer.dynatrace.com/develop/sdks/                        |
| **Document API SDK**          | https://developer.dynatrace.com/develop/sdks/client-document/        |
| **App Settings v2 SDK**       | https://developer.dynatrace.com/develop/sdks/client-app-settings-v2/ |
| **App Settings v2 (npm)**     | https://www.npmjs.com/package/@dynatrace-sdk/client-app-settings-v2  |
| **Store Static Data (Grail)** | https://developer.dynatrace.com/develop/data/store-static-data-in-grail/ |
| **Store User Data**           | https://developer.dynatrace.com/develop/data/store-user-generated-data/  |
| **Store App Settings**        | https://developer.dynatrace.com/develop/data/store-app-settings/         |
| **Automate Dependency Updates** | https://developer.dynatrace.com/develop/automate-dependency-updates/   |

## Key Patterns

### Link Generation

**IMPORTANT:** Never hardcode environment URLs. Use `getEnvironmentUrl()` from `@dynatrace-sdk/app-environment`:

```typescript
import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";

// Correct - dynamic URL
href={`${getEnvironmentUrl()}/ui/apps/dynatrace.notebooks/notebook/${id}`}

// Wrong - hardcoded URL
href={`https://xzj8412h.sprint.apps.dynatracelabs.com/ui/apps/dynatrace.notebooks/notebook/${id}`}
```

### Environment Shares

```typescript
import { environmentSharesClient } from "@dynatrace-sdk/client-document";

// Create a share
const share = await environmentSharesClient.createEnvironmentShare({
  body: { documentId: "...", access: "read" }, // or "read-write"
});

// Share claim URL format
const claimUrl = `${getEnvironmentUrl()}/ui/document/v0/share/${share.id}/claim`;
```

## Maintenance

**KEEP THIS FILE UPDATED** when you:

- Add new pages or routes
- Add new API functions
- Change project structure
- Add new features
- Update version numbers
- Change environment configurations
