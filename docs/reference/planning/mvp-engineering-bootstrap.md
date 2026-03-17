# MVP Engineering Bootstrap

## Purpose

Define the baseline engineering operating model for MVP delivery so work can ship quickly with consistent quality.

## 1) Architecture Decisions

- Monorepo: Nx workspace with `packages/*`.
- Runtime/tooling: Bun + TypeScript.
- Frontend: Next.js (`packages/mukti-web`).
- Backend: NestJS (`packages/mukti-api`).
- Service boundaries:
  - Web handles UX and client-side orchestration.
  - API owns auth, domain logic, persistence, and integrations.
  - MCP package remains isolated from core app runtime paths.
- Local infrastructure baseline: MongoDB + Redis via `docker compose`.

## 2) Repository Conventions

- Package layout:
  - `packages/mukti-web`: frontend app.
  - `packages/mukti-api`: backend API.
  - `packages/mukti-mcp`: MCP package/prototype work.
- Shared docs and references:
  - `docs/reference/*` for architecture/data/planning references.
  - `docs/rfcs/*` for design decisions and proposals.
- Root scripts are the canonical entrypoint for local and CI operations.
- Conventional commits enforced via Commitizen + commitlint.

## 3) Local Dev Workflow

- Start local development:
  - `bun run dev` (all services via Nx)
  - Optional infra + app stack: `docker compose up -d`
- Standard pre-PR quality sequence:
  1. `bun run format:check`
  2. `bun run lint`
  3. `bun run type-check`
  4. `bun run test`
  5. `bun run build`
- Fast incremental flow:
  - `bun run check:affected` for changed projects only.

## 4) CI Quality Gates

GitHub Actions workflow (`.github/workflows/ci.yml`) enforces:

- Docs validation (`docs:check`)
- Formatting (`nx affected --target=format:check`)
- Lint (`nx affected --target=lint`)
- Type checks (`nx affected --target=type-check`)
- Tests (`nx affected --target=test`)
- Build (`nx affected --target=build`)

Main branch deploy runs only after quality gate success.

## 5) Exit Criteria For "Engineering Bootstrap Complete"

- Architecture and repo conventions documented (this file + existing architecture docs).
- Root quality commands available for full and affected checks.
- CI quality gate covering docs, format, lint, types, tests, and build.
- Team can run one command locally to validate readiness before merge.
