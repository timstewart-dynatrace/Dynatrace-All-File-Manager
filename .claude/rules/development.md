# Development Guide

> **DISCLAIMER**: This information was AI generated and is provided "as-is" without warranty. It was generated as an independent, community-driven project and **not supported by Dynatrace**. Always refer to official [Dynatrace documentation](https://docs.dynatrace.com/docs) for the most current information.

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
5. **Update Documentation:** When adding features, pages, or API functions, update relevant docs

## Version Management

**IMPORTANT:** Before each deploy, update the version in TWO places:
1. `app.config.json` - `"version": "x.y.z"`
2. `ui/app/constants.ts` - `APP_VERSION = "x.y.z"`

Both locations MUST have **matching** version numbers.

Follow [Semantic Versioning 2.0.0](https://semver.org/):
- **MAJOR** (X.0.0) - Incompatible API changes
- **MINOR** (0.X.0) - New features (backwards-compatible)
- **PATCH** (0.0.X) - Bug fixes (backwards-compatible)

## Deployment

**Environment Configuration:**
- Change `environmentUrl` in `app.config.json` before deploying to different environments
- Sprint: `https://xzj8412h.sprint.apps.dynatracelabs.com/`
- Production: `https://yhu28601.apps.dynatrace.com/`

```bash
npm run deploy
```

## Branching Strategy

1. **NEVER commit features directly to main**
   - Use feature branches: `feature/descriptive-name` or `fix/descriptive-name`
   - Only documentation fixes and critical hotfixes may go directly to main

2. **Merge Process**
   - Verify ALL documentation is complete before merging
   - Use `--no-ff` for merge commits to preserve branch history

## Documentation Requirements

**ALL features MUST be documented BEFORE merging to main**

Documentation checklist:
- [ ] README.md - Update if user-facing changes
- [ ] CHANGELOG.md - Add to appropriate section
- [ ] Code comments and docstrings for new functions/classes
- [ ] .claude/CLAUDE.md or rules files if architecture changes

## Linting Notes

- ESLint includes security plugins (no-secrets, security, no-unsanitized, @microsoft/sdl)
- Warning about React version can be ignored or fixed by adding `settings: { react: { version: 'detect' } }` to eslint config
- Node.js 22 is recommended for dt-app CLI

## Error Handling

- Provide actionable error messages with suggestions
- Include API error details when relevant
- Use consistent patterns across all API functions
