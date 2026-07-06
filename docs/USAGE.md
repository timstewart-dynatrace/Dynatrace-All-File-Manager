# Usage Guide

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

## Overview

DT File Manager provides bulk file management capabilities for Dynatrace notebooks, dashboards, and lookup files.

## Getting Started

### Prerequisites

- Node.js 22 (recommended for dt-app CLI)
- Access to a Dynatrace environment

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dt-file-manager

# Install dependencies
npm install
```

### Configuration

1. Update `app.config.json` with your environment URL:
   - Sprint: `https://xzj8412h.sprint.apps.dynatracelabs.com/`
   - Production: `https://yhu28601.apps.dynatrace.com/`

2. Ensure OAuth scopes are configured (see [Permissions](#permissions) below)

### Running the App

```bash
# Development mode with hot reload
npm run start

# Build for production
npm run build

# Deploy to Dynatrace environment
npm run deploy
```

## Permissions

The app requests the following OAuth scopes when installed. A Dynatrace environment admin must approve these scopes. Features that require a scope that has not been granted will silently fail or show empty results.

| Scope | Features enabled |
|-------|-----------------|
| `document:documents:read` | View and export notebooks, dashboards, documents |
| `document:documents:write` | Upload files; toggle public/private visibility |
| `document:documents:delete` | Delete notebooks, dashboards, documents |
| `document:environment-shares:read` | Display existing share URLs |
| `document:environment-shares:write` | Generate share links |
| `document:environment-shares:delete` | Revoke share links |
| `storage:files:read` | Browse and download lookup files |
| `storage:files:write` | Upload lookup files to Grail |
| `storage:files:delete` | Delete lookup files from Grail |

**Minimum scopes for read-only use:** `document:documents:read` + `storage:files:read`

**Full access requires all scopes above.**

> Scopes are declared in `app.config.json` and granted at install time via the Dynatrace App management UI.

## Features

### Notebook Manager

Navigate to `/notebook-manager` to manage Dynatrace notebooks.

**Capabilities:**
- **Bulk Upload** - Upload multiple notebook JSON files at once
- **Export Selected** - Download notebooks as JSON files (includes metadata + content)
- **Make Private** - Set visibility to private (only you can see)
- **Make Public** - Set visibility to public (warning: anyone can see)
- **Delete Selected** - Bulk delete with confirmation
- **Generate Share Links** - Create shareable URLs (owners only)

**Tips:**
- Only document owners can modify visibility, delete, or create share links
- Use the filter to search by name or owner
- Click column headers to sort

### Dashboard Manager

Navigate to `/dashboard-manager` to manage Dynatrace dashboards.

All features mirror Notebook Manager. Links open dashboards in the `dynatrace.dashboards` app.

### Lookup File Manager

Navigate to `/lookup-file-manager` to manage lookup files in Grail.

**Capabilities:**
- **Browse Files** - View all lookup files with metadata
- **Upload Files** - Upload CSV, JSON, JSONL, or XML files (max 100 MB)
- **Download Files** - Download selected files as CSV
- **Delete Files** - Bulk delete with confirmation

**Supported Formats:** CSV, JSON, JSONL, XML

## Development Workflow

### Adding a New Page

1. Create component in `ui/app/pages/`
2. Add route in `App.tsx`
3. Add nav item in `Header.tsx`
4. Optionally add card on `Home.tsx`
5. Update documentation

### Adding API Functions

1. Create `api/<name>.function.ts`
2. Call via fetch:
   ```typescript
   const response = await fetch('/api/<name>', {
     method: 'POST',
     body: JSON.stringify(payload)
   });
   ```

### Version Updates

Before each deploy, update version in TWO places:
1. `app.config.json` - `"version": "x.y.z"`
2. `ui/app/constants.ts` - `APP_VERSION = "x.y.z"`

### Assets

Use SVG for icons. Create both light and dark variants:
- `icon.svg` - Light theme
- `icon_dark.svg` - Dark theme

## Troubleshooting

### ESLint Warnings

If you see React version warnings, add to `eslint.config.mjs`:
```javascript
settings: { react: { version: 'detect' } }
```

### Environment URLs

Never hardcode environment URLs. Always use:
```typescript
import { getEnvironmentUrl } from "@dynatrace-sdk/app-environment";
const url = getEnvironmentUrl();
```

## API Reference

See [Commands Reference](../.claude/rules/commands.md) for full API documentation.
