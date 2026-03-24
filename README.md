# DT File Manager

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

A Dynatrace App providing file management utilities. Built with React and TypeScript using the Strato Design System.

## Features

- **Notebook Manager** - Bulk operations for Dynatrace notebooks (upload, export, visibility control, sharing)
- **Dashboard Manager** - Bulk operations for Dynatrace dashboards (upload, export, visibility control, sharing)
- **Lookup File Manager** - Manage lookup files in Dynatrace Grail (upload, download, delete)

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
- [Changelog](CHANGELOG.md) - Version history

## Tech Stack

- React 18.3.1
- TypeScript 5.9.3
- React Router DOM 6.22.2
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

| Command | Description |
|---------|-------------|
| `npm run start` | Dev server with hot reload |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build and deploy to Dynatrace |
| `npm run info` | Show CLI and environment info |
| `npm run generate:function` | Generate new serverless function |
| `npm run update` | Update @dynatrace-scoped packages |

## Learn More

- [Dynatrace Developer](https://dt-url.net/developers) - Platform documentation
- [React Documentation](https://reactjs.org/) - React reference

## License

This project is provided as-is.
