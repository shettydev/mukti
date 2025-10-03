---
description: Mukti Nx Monorepo - Development guidelines for working with this codebase
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: true
---

# Mukti Monorepo

This is an Nx monorepo with two main packages:
- **@mukti/api** - NestJS backend API
- **@mukti/web** - Next.js frontend

## Package Manager & Runtime

Use Bun as the primary package manager and runtime:

- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bun <file>` instead of `node <file>`
- Bun automatically loads .env files, so don't use dotenv

## Nx Commands

All tasks are managed through Nx for optimal caching and performance:

```bash
# Run targets for specific projects
bun nx run @mukti/api:serve      # Start API dev server
bun nx run @mukti/web:dev         # Start Next.js dev server
bun nx run @mukti/api:test        # Run API tests

# Run targets across all projects
bun run dev                       # Start all projects
bun run build                     # Build all projects
bun run lint                      # Lint all projects
bun run test                      # Test all projects

# Run only affected projects (faster)
bun run affected:lint
bun run affected:test
bun run affected:build
```

## Project Structure

### @mukti/api (NestJS Backend)

Located in `packages/mukti-api/`:
- Framework: NestJS
- Testing: Jest (configured with Bun compatibility)
- Available targets: build, serve, start, start:prod, lint, lint:fix, format, format:check, test, test:watch, test:cov, test:e2e

**Running the API:**
```bash
bun nx run @mukti/api:serve          # Development mode with watch
bun nx run @mukti/api:start          # Production mode
bun nx run @mukti/api:test           # Run tests
bun nx run @mukti/api:test:watch     # Watch mode
```

### @mukti/web (Next.js Frontend)

Located in `packages/mukti-web/`:
- Framework: Next.js 15
- React version: 19.0.0
- Available targets: build, dev, start, lint, lint:fix, format, format:check, type-check

**Running the Web App:**
```bash
bun nx run @mukti/web:dev            # Development server
bun nx run @mukti/web:build          # Production build
bun nx run @mukti/web:start          # Start production server
bun nx run @mukti/web:type-check     # TypeScript checking
```

## Code Quality & Git Workflow

### Commits

**Always use the interactive commit tool:**
```bash
git add .
bun run commit                       # Interactive guided commits
```

**Or use AI-powered commits:**
```bash
git add .
bun run ai:commit                    # AI generates commit message
```

### Pre-commit Hooks

Git hooks automatically run on commit:
1. **Lint** - Runs `bun nx affected --target=lint --fix` on changed projects
2. **Format** - Runs `bun nx affected --target=format` on changed projects
3. **Commit-msg validation** - Validates commit message format

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Valid types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, wip, init

**Valid scopes:** api, web, mcp-server, config, ci, deps, docker, deployment, monorepo, docs, readme, db, redis, ui, components, styles, test, e2e, release

### Formatting

- **Line width:** 100 characters
- **Quotes:** Single quotes
- **Indentation:** 2 spaces
- **Semicolons:** Required
- **Trailing commas:** ES5

All code is automatically formatted via Prettier on commit.

## Testing

### API Tests (Jest)
```bash
bun nx run @mukti/api:test           # Run all tests
bun nx run @mukti/api:test:watch     # Watch mode
bun nx run @mukti/api:test:cov       # With coverage
bun nx run @mukti/api:test:e2e       # E2E tests
```

Tests use Jest configured to work with Bun's runtime.

## Performance Tips

1. **Use affected commands** - Only work on changed code:
   ```bash
   bun run affected:lint
   bun run affected:test
   bun run affected:build
   ```

2. **Nx caching** - Builds are cached in `.nx/cache` automatically

3. **Visualize dependencies:**
   ```bash
   bun run graph
   ```

4. **Clear cache if needed:**
   ```bash
   bun nx reset
   ```
