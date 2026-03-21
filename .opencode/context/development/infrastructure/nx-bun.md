<!-- Context: development/infrastructure/nx-bun | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Nx + Bun — Mukti Monorepo

**Purpose**: Nx workspace commands, Bun runtime conventions, and project structure for Mukti

---

## Package Manager: Bun

**Always use `bun` — never `npm` or `node`**:

```bash
bun install                    # Install deps (not npm install)
bun run <script>               # Run package.json script
bun <file>                     # Execute file directly (not node)
bun nx run @mukti/api:serve    # Nx via bun
```

**Bun auto-loads `.env`** — never import `dotenv` anywhere in the codebase.

---

## Workspace Structure

```
mukti/                         # Nx workspace root
├── packages/
│   ├── mukti-api/             # @mukti/api  — NestJS backend
│   └── mukti-web/             # @mukti/web  — Next.js frontend
├── mukti-mcp-server/          # Standalone — NOT in Nx workspace
├── docs/rfcs/
├── scripts/
├── nx.json                    # Nx config (parallel: 3, cache: .nx/cache)
└── package.json               # Root scripts
```

---

## Common Nx Commands

### Dev servers

```bash
bun nx run @mukti/api:serve    # API on :3000 (watch mode)
bun nx run @mukti/web:dev      # Web on :3001
bun run dev                    # Both at once
```

### Build / Lint / Test

```bash
bun run build                  # All projects
bun run lint                   # All projects
bun run test                   # All projects

bun nx run @mukti/api:test          # API tests
bun nx run @mukti/api:test:watch    # Watch mode
bun nx run @mukti/api:test:cov      # Coverage
bun nx run @mukti/api:test:e2e      # E2E
```

### Affected-only (faster CI)

```bash
bun run affected:lint           # Only changed projects
bun run affected:test
bun run affected:build
```

### Utilities

```bash
bun nx reset                   # Clear .nx/cache
bun run graph                  # Visualize project dependencies
```

---

## Nx Configuration (`nx.json`)

Key settings:

- **Parallel tasks**: 3
- **Cache directory**: `.nx/cache`
- **Plugins**: `@nx/next`, `@nx/eslint`, `@nx/jest`

Target names per project defined in `packages/*/project.json`.

---

## Project Targets

### `@mukti/api`

| Target       | Command                       |
| ------------ | ----------------------------- |
| `serve`      | NestJS watch mode (port 3000) |
| `build`      | Compile to `dist/`            |
| `test`       | Jest                          |
| `test:watch` | Jest watch                    |
| `test:cov`   | Jest coverage                 |
| `test:e2e`   | E2E tests                     |
| `lint`       | ESLint                        |
| `format`     | Prettier                      |

### `@mukti/web`

| Target   | Command                        |
| -------- | ------------------------------ |
| `dev`    | Next.js dev server (port 3001) |
| `build`  | Next.js production build       |
| `start`  | Next.js production server      |
| `lint`   | ESLint                         |
| `format` | Prettier                       |

---

## MCP Server (Standalone)

`mukti-mcp-server/` is **not** part of the Nx workspace:

```bash
# Run independently
cd mukti-mcp-server
bun install
bun run dev
```

---

## Codebase References

- `nx.json` — Nx workspace config
- `packages/mukti-api/project.json` — API targets
- `packages/mukti-web/project.json` — Web targets
- `package.json` — Root-level `dev`, `build`, `test`, `affected:*` scripts
