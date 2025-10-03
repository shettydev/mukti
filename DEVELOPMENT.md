# Mukti Monorepo Setup - Quick Reference

## ✅ Configuration Complete

Your Mukti monorepo is now fully configured with industry best practices!

---

## 🚀 Quick Start

### Development

```bash
# Start all apps in development mode
bun run dev

# Start specific project
bun nx run @mukti/api:serve     # API dev server
bun nx run @mukti/web:dev        # Web dev server
```

### Building

```bash
# Build all projects
bun run build

# Build specific project
bun nx run @mukti/api:build
bun nx run @mukti/web:build

# Build only changed projects
bun run affected:build
```

### Linting & Formatting

```bash
# Lint all projects
bun run lint

# Lint and auto-fix
bun run lint:fix

# Format all code
bun run format

# Check formatting
bun run format:check

# Lint/test only affected projects
bun run affected:lint
bun run affected:test
```

### Testing

```bash
# Run all tests
bun run test

# Run tests with coverage
bun run test:cov

# Test specific project
bun nx run @mukti/api:test
bun nx run @mukti/api:test:watch
bun nx run @mukti/api:test:e2e
```

---

## 🎯 Committing Changes

### Interactive Commit (Recommended)

```bash
# Stage your changes
git add .

# Use interactive commit CLI
bun run commit
```

This launches a guided prompt that helps you:
1. Select commit type (feat, fix, docs, etc.)
2. Choose scope (api, web, auth, etc.)
3. Write proper subject and body
4. Mark breaking changes
5. Reference issues

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Example:**
```
feat(auth): Add JWT token refresh mechanism

Implemented automatic token refresh using refresh tokens.
This prevents token expiration during long sessions.

Closes #123
```

### Available Types

- `feat` ✨ - New feature
- `fix` 🐛 - Bug fix
- `docs` 📚 - Documentation
- `style` 💎 - Code style
- `refactor` 📦 - Refactoring
- `perf` 🚀 - Performance
- `test` 🚨 - Tests
- `build` 🛠 - Build system
- `ci` ⚙️ - CI/CD
- `chore` ♻️ - Maintenance

### Available Scopes

**Projects:** api, web, mcp-server

**Infrastructure:** config, ci, deps, docker, deployment, monorepo

**Documentation:** docs, readme

**Database:** db, redis

**UI/UX:** ui, components, styles

**Testing:** test, e2e

**Other:** release

---

## 🔧 What's Configured

### ✅ Nx (Primary Task Runner)

- **Computation caching** - Never rebuild unchanged code
- **Affected commands** - Only work on what changed
- **Task orchestration** - Automatic dependency management
- **Parallel execution** - Run tasks concurrently

**Cache location:** `.nx/cache`

**Visualize dependencies:**
```bash
bun run graph
```

### ✅ Commitizen (Interactive Commits)

- Guided commit message creation
- Enforced conventional commits
- Predefined types and scopes
- Emoji support

### ✅ Commitlint (Message Validation)

- Validates commit format
- Enforces scopes from predefined list
- Character limit enforcement
- Sentence-case subject validation

### ✅ Nx Affected (Pre-Commit Quality)

Automatically runs on `git commit`:
- ESLint with auto-fix on affected projects
- Prettier on affected projects
- Only runs on changed projects (fast!)

### ✅ Git Hooks

**Pre-commit:** Runs Nx affected lint and format
```bash
bun nx affected --target=lint --fix --parallel=3
bun nx affected --target=format --parallel=3
```

**Commit-msg:** Validates commit message
```bash
bunx --bun commitlint --edit $1
```

### ✅ Prettier (Code Formatting)

**Config highlights:**
- Single quotes
- 100 character line width
- 2 space indentation
- Trailing commas (ES5)
- Semicolons enabled

### ✅ Project Configuration

Both packages have `project.json` with defined targets:

**@mukti/api (NestJS):**
- build, serve, start, start:prod
- lint, lint:fix
- format, format:check
- test, test:watch, test:cov, test:e2e
- Uses Jest for testing

**@mukti/web (Next.js):**
- build, dev, start
- lint, lint:fix
- format, format:check
- type-check
- Uses Next.js built-in linting

---

## 📦 Package Structure

```
mukti/
├── packages/
│   ├── mukti-api/           # NestJS backend
│   │   ├── src/
│   │   ├── test/
│   │   ├── project.json     # Nx configuration
│   │   └── package.json
│   └── mukti-web/           # Next.js frontend
│       ├── src/
│       ├── project.json     # Nx configuration
│       └── package.json
├── .husky/                  # Git hooks
│   ├── pre-commit           # Runs affected lint & format
│   └── commit-msg           # Validates commit messages
├── .nx/                     # Nx cache
├── nx.json                  # Nx workspace config
├── commitlint.config.js     # Commit validation
├── .prettierrc              # Prettier config
└── package.json             # Root package with scripts
```

---

## 🎨 Additional Features to Consider

### 1. Shared Types Package

Create `packages/shared` for:
- Shared TypeScript types
- Utility functions
- Constants

```bash
# Usage in other packages
import { User, Conversation } from '@mukti/shared';
```

### 2. GitHub Actions CI/CD

Example workflow:

```yaml
name: CI
on: [pull_request, push]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run affected:lint
      - run: bun run affected:test
      - run: bun run affected:build
```

### 3. Docker Optimization

Use nx cache in Docker:

```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app
COPY . .
RUN bun install
RUN bun nx run @mukti/api:build

# Copy nx cache for faster rebuilds
COPY --from=builder /app/.nx/cache ./.nx/cache
```

### 4. VS Code Workspace

Create `mukti.code-workspace`:

```json
{
  "folders": [
    { "path": "." },
    { "path": "packages/mukti-api" },
    { "path": "packages/mukti-web" }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    }
  }
}
```

### 5. TypeScript Project References

For faster type-checking and IDE performance:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true
  }
}
```

### 6. Bundle Analysis

**Next.js:**
```bash
bun add -D @next/bundle-analyzer
ANALYZE=true bun nx run @mukti/web:build
```

### 7. Dependency Boundaries

Prevent unwanted dependencies:

```bash
bun add -D dependency-cruiser
bunx depcruise --init
```

---

## 🔍 Troubleshooting

### Clear Nx Cache

```bash
bun nx reset
```

### Reinstall Dependencies

```bash
rm -rf node_modules packages/*/node_modules
bun install
```

### Reinstall Git Hooks

```bash
rm -rf .husky
bun run prepare
```

### Test Commit Message

```bash
echo "feat(api): Test message" | bunx commitlint
```

### Check Commitlint Config

```bash
bunx commitlint --print-config
```

---

## 📊 Performance Tips

### 1. Use Affected Commands

```bash
# Instead of testing everything
bun run test

# Only test changed code
bun run affected:test
```

### 2. Parallel Execution

Already configured:
```bash
bun run dev  # Runs with --parallel=2
```

### 3. Cache Management

Nx caches everything automatically. View cache:
```bash
ls -la .nx/cache
```

Clear if needed:
```bash
bun nx reset
```

### 4. Build Optimization

```bash
# Build with production optimizations
NODE_ENV=production bun run build
```

---

## 🎯 Best Practices

### 1. Always Use `bun run commit`

Instead of `git commit`, use:
```bash
bun run commit
```

This ensures proper formatting and validation.

### 2. Run Affected Commands in CI/CD

```bash
bun run affected:lint
bun run affected:test
bun run affected:build
```

Only builds what changed = faster CI.

### 3. Keep Dependencies Up to Date

```bash
bun update
```

### 4. Visualize Changes

```bash
bun run graph
```

See which projects are affected by your changes.

### 5. Use Proper Scopes

Always include a scope in commits:
```
feat(auth): Add login
```

Not:
```
feat: Add login
```

---

## 📚 Additional Resources

- **Nx Documentation:** https://nx.dev
- **Commitlint:** https://commitlint.js.org
- **Commitizen:** https://commitizen-tools.github.io/commitizen
- **Conventional Commits:** https://www.conventionalcommits.org
- **Bun Documentation:** https://bun.sh/docs

---

## 🎉 Summary

Your monorepo now has:

✅ **Nx** - Smart build system with caching
✅ **Commitizen** - Interactive guided commits
✅ **Commitlint** - Commit message validation
✅ **Nx Affected** - Pre-commit quality checks
✅ **Git Hooks** - Automated quality enforcement
✅ **Prettier** - Consistent code formatting
✅ **Bun** - Fast package manager and runtime
✅ **Jest** - Testing framework for API
✅ **Project Configs** - Defined tasks for all packages

**Everything runs through Nx for optimal performance and caching.**

Start developing:
```bash
bun run dev
```

Make a commit:
```bash
git add .
bun run commit
```

Happy coding! 🚀
