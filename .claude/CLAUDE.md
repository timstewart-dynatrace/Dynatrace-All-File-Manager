# Dynatrace All File Manager - Claude Code Instructions

## What This Is

**Dynatrace All File Manager** is a Dynatrace App built with React and TypeScript using the Strato Design System. It provides file management utilities for Dynatrace.

- **App ID:** `my.dt.file.manager` (combined app; four standalone single-feature apps also deploy from this codebase — see "Deployment Targets" below)
- **Version:** 0.5.5
- **Sprint Environment:** https://xzj8412h.sprint.apps.dynatracelabs.com/
- **Production Environment:** https://yhu28601.apps.dynatrace.com/

## Tech Stack

See `@.claude/rules/development.md` - Development workflow and tech stack

## Architecture

See `@.claude/architecture.md` - Project structure and components

## Current Phase

See `.claude/phases/` — always check the active phase file before starting work.

## Rules

### Always active

@.claude/rules/common/core.md
@.claude/rules/common/decisions.md
@.claude/rules/common/git.md
@.claude/rules/common/testing.md
@.claude/rules/common/debug.md
@.claude/rules/common/existing-code.md

### project specific

@.claude/rules/common/frontend.md

### Language rules (uncomment what applies)

@.claude/rules/commands.md - API endpoints and commands

<!-- @.claude/rules/go/go.md -->
<!-- @.claude/rules/swift/swift.md -->

@.claude/rules/typescript/typescript.md

<!-- @.claude/rules/kotlin/kotlin.md -->
<!-- @.claude/rules/flutter/flutter.md -->
<!-- @.claude/rules/rust/rust.md -->
<!-- @.claude/rules/dotnet/dotnet.md -->
<!-- @.claude/rules/python/python.md -->
<!-- @.claude/rules/spring/spring.md -->

## Skills

@/Users/Shared/GitHub/CLAUDE/Claude-AI-Template/SKILLS/strato-design-system/SKILL.md
@/Users/Shared/GitHub/CLAUDE/Claude-AI-Template/SKILLS/dynatrace-document-api/SKILL.md
@/Users/Shared/GitHub/CLAUDE/Claude-AI-Template/SKILLS/dynatrace-lookup-tables/SKILL.md
@/Users/Shared/GitHub/CLAUDE/Claude-AI-Template/.agents/skills/dt-dql-essentials/SKILL.md
@/Users/Shared/GitHub/CLAUDE/Claude-AI-Template/SKILLS/dynatrace-dql-examples/SKILL.md
@/Users/Shared/GitHub/CLAUDE/Claude-AI-Template/SKILLS/dynatrace-apis/SKILL.md

## Project-Specific Constraints

**ALWAYS** ask clarifying questions and **ALWAYS** provide a plan **BEFORE** making changes to ensure the end result matches intent.

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
| `/notebook-manager`    | NotebookManager   | Bulk notebook management (thin wrapper around `components/DocumentManager.tsx`) |
| `/dashboard-manager`   | DashboardManager  | Bulk dashboard management (thin wrapper around `components/DocumentManager.tsx`) |
| `/lookup-file-manager` | LookupFileManager | Lookup table management in Grail   |
| `/file-manager`        | FileManager       | Document management                |

**Route registration is data-driven, not hardcoded in `App.tsx`.** `ui/app/features.ts` (`FEATURE_REGISTRY`) is the single source of truth for each route's path, nav label, and card icon. `App.tsx`, `Header.tsx`, and `Home.tsx` all filter against `ENABLED_FEATURES` (from `ui/app/appTarget.ts`) rather than hardcoding the route list — this is what allows the same code to build either the combined app or one of four standalone single-feature apps. **When adding a new page that should be part of this system, update `features.ts` first**, then add the route in `App.tsx`; do not add nav items to `Header.tsx` or cards to `Home.tsx` directly, they already read from the registry.

### Deployment Targets

This codebase deploys as the combined app (`npm run deploy`) or as one of four standalone apps that coexist in the same Dynatrace environment, each requesting only the OAuth scopes its feature needs: `npm run deploy:notebooks`, `deploy:dashboards`, `deploy:lookup`, `deploy:documents` (matching `start:*` scripts for local preview). See `.claude/architecture.md` → "Deployment Targets" for the full mechanism (`scripts/with-target.mjs` config swap) and `.claude/DECISIONS.md` (2026-07-06) for why this approach was chosen over separate repos.

## Dynatrace SDK Reference

**Always consult these resources when working with Dynatrace APIs:**

| Resource                        | URL                                                                      |
| ------------------------------- | ------------------------------------------------------------------------ |
| **SDK Overview**                | https://developer.dynatrace.com/develop/sdks/                            |
| **Document API SDK**            | https://developer.dynatrace.com/develop/sdks/client-document/            |
| **App Settings v2 SDK**         | https://developer.dynatrace.com/develop/sdks/client-app-settings-v2/     |
| **App Settings v2 (npm)**       | https://www.npmjs.com/package/@dynatrace-sdk/client-app-settings-v2      |
| **Store Static Data (Grail)**   | https://developer.dynatrace.com/develop/data/store-static-data-in-grail/ |
| **Store User Data**             | https://developer.dynatrace.com/develop/data/store-user-generated-data/  |
| **Store App Settings**          | https://developer.dynatrace.com/develop/data/store-app-settings/         |
| **Automate Dependency Updates** | https://developer.dynatrace.com/develop/automate-dependency-updates/     |

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

## Context

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Maintenance

**IMPORTANT: KEEP ALL RELATED FILES UPDATED** Especially [DECISIONS](DECISIONS.md) and [docs/CHANGELOG](../docs/CHANGELOG.md) and [architecture](architecture.md) when you:

- Add new pages or routes
- Add new API functions
- Change project structure
- Add new features
- Update version numbers
- Change environment configurations
