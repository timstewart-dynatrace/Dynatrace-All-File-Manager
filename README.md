# Dynatrace All File Manager

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

A Dynatrace App providing file management utilities. Built with React and TypeScript using the Strato Design System.

## Features

- **Notebooks** - Bulk operations for Dynatrace notebooks (upload, export, visibility control, sharing)
- **Dashboards** - Bulk operations for Dynatrace dashboards (upload, export, visibility control, sharing)
- **Lookup Tables** - Manage lookup files in Dynatrace Grail (upload, download, delete)
- **Documents** - Manage all other document types (upload, export, visibility control, delete)

## Permissions

This app requires the following OAuth scopes, approved by a Dynatrace environment admin at install time:

| Scope | Purpose |
|-------|---------|
| `document:documents:read` | View/export notebooks, dashboards, documents |
| `document:documents:write` | Upload files; toggle visibility |
| `document:documents:delete` | Delete notebooks, dashboards, documents |
| `document:environment-shares:read` | Display share URLs |
| `document:environment-shares:write` | Generate share links |
| `document:environment-shares:delete` | Revoke share links |
| `storage:files:read` | Browse/download lookup files |
| `storage:files:write` | Upload lookup files |
| `storage:files:delete` | Delete lookup files |

See [docs/USAGE.md](docs/USAGE.md#permissions) for the minimum scope set for read-only use.

## Deployment Options

This app can deploy as the combined app above, or as four standalone single-feature apps (Notebook Manager, Dashboard Manager, Lookup Table Manager, Document Manager) that coexist in the same environment — each requesting only the scopes its one feature needs:

```bash
npm run deploy:notebooks
npm run deploy:dashboards
npm run deploy:lookup
npm run deploy:documents
```

See [docs/USAGE.md](docs/USAGE.md#deploying-as-standalone-apps) for details.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run start

# Build for production
npm run build

# Deploy to Dynatrace
npm run deploy
```

## Documentation

- [Usage Guide](docs/USAGE.md) - Detailed usage instructions
- [Changelog](docs/CHANGELOG.md) - Version history

## Tech Stack

- React 19
- TypeScript 6
- React Router DOM 7
- Dynatrace Strato Design System
- Dynatrace App Toolkit (dt-app)
- Dynatrace SDKs (client-document, client-query, etc.)

## Development

See [docs/USAGE.md](docs/USAGE.md) for detailed development instructions.

### Version Management

Before each deploy, update the version in TWO places:

1. `app.config.json` - `"version": "x.y.z"`
2. `ui/app/constants.ts` - `APP_VERSION = "x.y.z"`

## Available Scripts

| Command                     | Description                       |
| --------------------------- | --------------------------------- |
| `npm run start`             | Dev server with hot reload (combined app) |
| `npm run build`             | Build for production              |
| `npm run lint`              | Run ESLint                        |
| `npm run test`              | Run unit tests                    |
| `npm run deploy`            | Build and deploy the combined app to Dynatrace |
| `npm run deploy:notebooks`  | Deploy standalone Notebook Manager app |
| `npm run deploy:dashboards` | Deploy standalone Dashboard Manager app |
| `npm run deploy:lookup`     | Deploy standalone Lookup Table Manager app |
| `npm run deploy:documents`  | Deploy standalone Document Manager app |
| `npm run info`              | Show CLI and environment info     |
| `npm run generate:function` | Generate new serverless function  |
| `npm run update`            | Update @dynatrace-scoped packages |

## Learn More

- [Dynatrace Developer](https://dt-url.net/developers) - Platform documentation
- [React Documentation](https://reactjs.org/) - React reference

## License

This project is provided as-is.
