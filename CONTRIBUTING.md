# Contributing to Mukti

Thank you for your interest in contributing to Mukti. Every contribution — code, documentation, tests, or thoughtful discussion — helps further a project built around a simple conviction: AI should sharpen thinking, not replace it.

---

## Philosophy

Mukti (मुक्ति) is a **thinking workspace**, not an answer machine. Its Socratic assistant guides users through problems with questions, structure, and reflection — never shortcuts. Contributions should align with this direction.

> Ask yourself: does this change help users think more clearly, or does it reduce the friction of thinking?

If a proposed feature shortcuts the reflective process, it's probably out of scope. If it deepens inquiry, structures reasoning, or surfaces assumptions — it belongs here.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager and runtime)
- [Docker](https://www.docker.com/) (for MongoDB and Redis)
- Node.js-compatible IDE with TypeScript support

### Setup

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/mukti.git
cd mukti

# 2. Install dependencies
bun install

# 3. Start infrastructure
docker compose up -d mongodb redis

# 4. Copy environment variables
cp .env.example .env
# Fill in the required values (JWT_SECRET, OPENROUTER_API_KEY, etc.)

# 5. Start all services
bun run dev
```

Services start at:

- API: `http://localhost:3000` (Swagger at `/api/docs`)
- Web: `http://localhost:3001`

---

## Development Workflow

### Branch Naming

```
feat/<short-description>     # New feature
fix/<short-description>      # Bug fix
docs/<short-description>     # Documentation only
chore/<short-description>    # Maintenance, deps, config
refactor/<short-description> # Refactoring without behavior change
```

Examples: `feat/scaffold-level-hints`, `fix/sse-reconnect-loop`, `docs/canvas-api-guide`

### Key Commands

```bash
bun run dev              # Start all services (API + Web)
bun run test             # Run all tests
bun run lint             # Lint all projects
bun run lint:fix         # Lint with auto-fix
bun run format           # Format all code (Prettier)
bun run affected:test    # Test only changed packages (faster in CI)
bun run affected:lint    # Lint only changed packages
bun run graph            # Visualize project dependencies
```

### Per-Package Commands

```bash
bun nx run @mukti/api:serve        # API dev server (watch mode)
bun nx run @mukti/web:dev          # Next.js dev server
bun nx run @mukti/api:test         # API unit tests
bun nx run @mukti/api:test:watch   # API tests in watch mode
bun nx run @mukti/api:test:cov     # API tests with coverage
bun nx run @mukti/api:test:e2e     # E2E tests
```

---

## Code Standards

### TypeScript

- Strict mode (`"strict": true`) — no implicit `any`
- Prefer interfaces for object shapes
- Export only what is needed; avoid barrel re-exports that hide intent
- Use discriminated unions over loose `string | undefined` patterns

### Formatting

Enforced via Prettier (runs automatically on `git commit`):

| Setting        | Value     |
| -------------- | --------- |
| Line width     | 100 chars |
| Quotes         | Single    |
| Indentation    | 2 spaces  |
| Semicolons     | Required  |
| Trailing comma | ES5       |

### Backend (`packages/mukti-api/`)

Follow established NestJS module conventions:

- Each feature module lives in `src/modules/<feature>/`
- Add Swagger decorators in a sibling `.swagger.ts` file — keep controllers clean
- AI operations use the **queue-based pattern**: POST returns `{ jobId, position }` (202), SSE stream delivers the response
- SSE event sequence: `processing → message → complete | error`
- All routes are JWT-protected globally — use `@Public()` to opt out
- Register new schemas in `src/schemas/index.ts` via the `ALL_SCHEMAS` array

### Frontend (`packages/mukti-web/`)

- Use the **App Router** (`app/` directory) — no Pages Router patterns
- Prefer server components; use `'use client'` only when interaction requires it
- Access token stays in memory only (Zustand `auth-store`) — never in localStorage
- Optimistic updates with rollback live in `canvas-store`
- Add new API calls to the appropriate module in `src/lib/api/`

---

## Commit Convention

> **Always use `bun run commit` instead of `git commit` directly.**

This launches an interactive CLI (Commitizen) that enforces the conventional commit format and runs pre-commit hooks automatically.

```bash
git add .
bun run commit       # Interactive guided commit (recommended)
bun run ai:commit    # AI-generated commit message (OpenCommit)
```

### Format

```
<type>(<scope>): <subject>

<optional body>

<optional footer: Closes #issue>
```

### Types

| Type       | When to use                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `docs`     | Documentation only                  |
| `style`    | Formatting, no logic change         |
| `refactor` | Refactoring without behavior change |
| `perf`     | Performance improvement             |
| `test`     | Adding or updating tests            |
| `build`    | Build system or tooling             |
| `ci`       | CI/CD pipeline changes              |
| `chore`    | Maintenance, deps, config           |
| `revert`   | Reverting a previous commit         |
| `wip`      | Work in progress (use sparingly)    |

### Scopes

**Projects:** `api`, `web`, `mcp-server`  
**Infrastructure:** `config`, `ci`, `deps`, `docker`, `deployment`, `monorepo`  
**Documentation:** `docs`, `readme`  
**Database:** `db`, `redis`  
**UI/UX:** `ui`, `components`, `styles`  
**Testing:** `test`, `e2e`  
**Other:** `release`

**Example:**

```
feat(api): add scaffold-level hints to dialogue responses

Implements Level 1-3 hint generation in DialogueService based on
the currentScaffoldLevel stored on NodeDialogue documents.

Closes #42
```

---

## Testing

```bash
bun nx run @mukti/api:test         # Run all API tests
bun nx run @mukti/api:test:cov     # With coverage report
bun nx run @mukti/api:test:watch   # Watch mode during development
```

### Guidelines

- Every new service method should have a corresponding unit test
- Security-critical paths (auth, token rotation, rate limiting) **must** include property-based tests using [fast-check](https://fast-check.dev/)
- Property tests live in `__tests__/properties/*.property.spec.ts`
- Aim for >80% coverage on new modules; do not reduce existing coverage

```typescript
// Example property-based test (fast-check)
import fc from 'fast-check';

it('should reject tokens with invalid signatures for any payload', () => {
  fc.assert(
    fc.property(fc.string(), (payload) => {
      expect(() => verifyToken(payload + 'tampered')).toThrow();
    })
  );
});
```

---

## Pull Requests

- **Small and focused** — one concern per PR; split large changes into sequential PRs
- **Link an issue** — every PR should reference an existing issue (`Closes #123`)
- **Explain the why** — the PR description should explain the motivation, not just the change
- **Pass CI** — lint, format, and tests must pass before review is requested

Use the existing [PR template](.github/pull_request_template.md) when opening a pull request.

### Before Submitting

```bash
bun run lint        # No lint errors
bun run format      # Code is formatted
bun run test        # All tests pass
```

---

## Project Areas

| Module                   | Location                                            | Description                                                      |
| ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| `AuthModule`             | `packages/mukti-api/src/modules/auth/`              | JWT + Google OAuth, refresh token rotation, email verification   |
| `AiModule`               | `packages/mukti-api/src/modules/ai/`                | OpenRouter/Gemini clients, BYOK key encryption, model resolution |
| `CanvasModule`           | `packages/mukti-api/src/modules/canvas/`            | Thinking Canvas CRUD (Seed, Soil, Root, Insight nodes)           |
| `ConversationsModule`    | `packages/mukti-api/src/modules/conversations/`     | Text-based Socratic sessions, BullMQ queue, SSE streaming        |
| `DialogueModule`         | `packages/mukti-api/src/modules/dialogue/`          | Per-node canvas dialogue, BullMQ queue, SSE streaming            |
| `KnowledgeTracingModule` | `packages/mukti-api/src/modules/knowledge-tracing/` | Bayesian Knowledge Tracing (RFC-0001, in progress)               |
| `WaitlistModule`         | `packages/mukti-api/src/modules/waitlist/`          | Pre-launch waitlist                                              |
| Next.js App              | `packages/mukti-web/src/app/`                       | Dashboard, Canvas, Conversations, Settings                       |
| Zustand Stores           | `packages/mukti-web/src/lib/stores/`                | auth, canvas, ai, chat, wizard state                             |
| MCP Server               | `packages/mukti-mcp/`                               | Standalone Socratic reasoning MCP tools                          |

RFCs for active design work live in `docs/rfcs/active/`.

---

## Reporting Issues

### Bug Reports

Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- Steps to reproduce (exact and ordered)
- Expected vs. actual behavior
- Environment details (OS, Node/Bun version, browser if applicable)

### Feature Requests

Open an issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md). Frame new features in terms of how they support deeper thinking, not faster output.

### Security Vulnerabilities

**Do not open a public issue for security vulnerabilities.**  
Email `pshettydev@gmail.com` with details. Include reproduction steps and impact assessment. We aim to respond within 48 hours.

---

## Questions

For questions, ideas, or open-ended discussion, use [GitHub Discussions](https://github.com/shettydev/mukti/discussions). Issues are reserved for bugs and concrete feature proposals.

---

## License

By contributing to Mukti, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

_"The only true wisdom is in knowing you know nothing."_ — Socrates
