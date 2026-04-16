---
description: Mukti Nx Monorepo - Development guidelines for working with this codebase
globs: '*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json'
alwaysApply: true
---

# Mukti Monorepo

## What is Mukti

Mukti (मुक्ति, "liberation") is a thinking workspace that combats cognitive dependency on AI. Instead of giving direct answers, Mukti uses a Socratic assistant that guides users through problems with probing questions, structured canvases, and reflection loops. The product philosophy: **more questions than answers**.

Key features:

- **Thinking Canvas** — visual problem-solving with Seed (problem), Soil (constraints), and Root (assumptions) nodes
- **Socratic Conversations** — text-based dialogue using 6 techniques: elenchus, dialectic, maieutics, definitional, analogical, counterfactual
- **Node Dialogues** — per-node Socratic chat within canvases (technique auto-selected by node type)
- **Knowledge Gap Detection** (RFC-0001, in progress) — Bayesian Knowledge Tracing to detect when Socratic questioning fails
- **Adaptive Scaffolding** (RFC-0002, in progress) — 5-level scaffold system that never gives direct answers

## Repo Structure

```
├── packages/mukti-api/        # @mukti/api — NestJS 11 backend
├── packages/mukti-web/        # @mukti/web — Next.js 15 frontend
├── docs/reference/            # Technical documentation assets
├── mukti-mcp-server/          # Standalone MCP server (not in Nx workspace)
├── docs/rfcs/                 # Design documents (RFC-0001, RFC-0002)
└── scripts/                   # AI commit, deploy scripts
```

## Package Manager & Runtime

Use **Bun** as the primary package manager and runtime:

- `bun install` (not npm), `bun run <script>` (not npm run), `bun <file>` (not node)
- Bun automatically loads .env files — do not use dotenv

## Nx Commands

```bash
# Per-project targets
bun nx run @mukti/api:serve      # API dev server (watch mode)
bun nx run @mukti/web:dev        # Next.js dev server (port 3001)
bun nx run @mukti/api:test       # API tests

# All projects
bun run dev                      # Start all
bun run build / lint / test      # Build/lint/test all

# Affected only (faster)
bun run affected:lint / affected:test / affected:build
```

## Infrastructure

Docker Compose provides: **MongoDB 7** (port 27017, db: `mukti`), **Redis 7** (port 6379). API runs on port 3000, Web on port 3001.

Key env vars: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OPENROUTER_API_KEY`, `SESSION_SECRET`, `CORS_ORIGINS`, `COOKIE_DOMAIN` (defaults to `mukti.chat` in production).

---

## @mukti/api — NestJS Backend

**Location:** `packages/mukti-api/` | **Framework:** NestJS 11 | **DB:** Mongoose 8 | **Queue:** BullMQ 5 | **Testing:** Jest + fast-check

### API Bootstrap

- Global prefix: `api/v1` (URI versioning)
- Swagger at `/api/docs`, Scalar at `/api/reference`
- All routes JWT-protected globally via `APP_GUARD` — use `@Public()` decorator to opt out
- Global `ValidationPipe` with transform + implicit conversion
- Response envelope: `{ success, data, meta: { requestId, timestamp } }` or `{ success, error: { code, message, details }, meta }`
- CSRF protection in production only (cookie-based)
- Helmet for security headers (CSP exempt on docs routes)

### Module Architecture

```
AppModule
├── DatabaseModule       — MongoDB connection, registers ALL_SCHEMAS from src/schemas/index.ts
├── AuthModule           — JWT + Google OAuth, email verification, refresh token rotation
├── AiModule             — OpenRouter/Gemini clients, BYOK key encryption, model resolution
├── CanvasModule         — Thinking Canvas CRUD (Seed/Soil/Root/Insight nodes, relationships)
├── ConversationsModule  — Text-based Socratic sessions, BullMQ queue, SSE streaming
├── DialogueModule       — Per-node canvas dialogue, BullMQ queue, SSE streaming
├── KnowledgeTracingModule — Bayesian Knowledge Tracing (RFC-0001, partially implemented)
├── HealthModule         — Health check endpoint
└── WaitlistModule       — Pre-launch waitlist
```

### Key Patterns

- **Queue-based AI**: POST message → `{ jobId, position }` (202 Accepted) → SSE stream for real-time response. Both ConversationsModule and DialogueModule use this pattern.
- **SSE events**: `processing → message → complete | error`. Connections keyed by `sessionId:nodeId`.
- **BYOK**: Users store encrypted OpenRouter/Gemini API keys. `AiPolicyService.resolveEffectiveModel()` resolves which key/model to use. Default model: `openai/gpt-5-mini`.
- **Canvas node IDs**: `seed` (singleton), `soil-{index}`, `root-{index}`, `insight-{index}`. Services parse these to determine node type.
- **Dialogue technique mapping**: seed → maieutics, root → elenchus, soil → counterfactual, insight → dialectic.
- **Swagger isolation**: Each module has a `.swagger.ts` file — keeps controllers clean.
- **Property-based testing**: Auth and conversations use `fast-check` for generative tests on security-critical paths. Test convention: `__tests__/properties/*.property.spec.ts`.

### Schemas (MongoDB)

Core domain: `User`, `Subscription`, `Conversation`, `CanvasSession`, `NodeDialogue`, `DialogueMessage`, `InsightNode`, `Concept`, `KnowledgeState`, `Technique`, `Vote`, `Resource`

Supporting: `SharedLink`, `UsageEvent`, `DailyUsageAggregate`, `RequestQueue`, `RateLimit`, `RefreshToken`, `Session`, `ArchivedMessage`, `Waitlist`

All schemas registered via `ALL_SCHEMAS` array in `src/schemas/index.ts`.

### Domain Relationships

- `User` → `Subscription` (1:1), `Conversation` (1:many), `CanvasSession` (1:many)
- `CanvasSession` → `NodeDialogue` (1:many, unique on `sessionId + nodeId`)
- `Concept` → `Concept[]` (DAG via `prerequisites[]`)
- `KnowledgeState` → `User` × `Concept` (unique on `userId + conceptId`)

### Auth Flow

Email/password + Google OAuth. Access tokens in memory, refresh tokens in httpOnly cookies + DB. Refresh token rotation on use. Email verification on signup.

Guards: `JwtAuthGuard` (global), `EmailVerifiedGuard`, `LoginRateLimitGuard`, `RolesGuard`
Decorators: `@CurrentUser()`, `@Public()`, `@Roles()`
Roles: `user`, `moderator`, `admin`

---

## @mukti/web — Next.js Frontend

**Location:** `packages/mukti-web/` | **Framework:** Next.js 15.4 | **React:** 19.1 | **State:** Zustand 5 | **Data:** TanStack Query v5

### App Router Structure

```
app/
├── (auth)/auth/          # Login, forgot/reset password, verify email, OAuth callbacks
├── dashboard/            # Authenticated app (catch-all [[...slug]])
│   ├── canvas/[id]/      # Thinking Canvas session
│   ├── conversations/[id]/ # Text conversation
│   ├── community/        # Technique community
│   ├── settings/         # User settings
│   └── ...               # help, messages, reports, resources, security, sessions
├── canvas/[id]/          # Public canvas viewer
├── chat/[id]/            # Public chat viewer
└── api/waitlist/         # Next.js API route
```

### State Management (Zustand Stores)

| Store          | Purpose                                                                      |
| -------------- | ---------------------------------------------------------------------------- |
| `auth-store`   | User (persisted to localStorage), accessToken (memory-only), isAuthenticated |
| `canvas-store` | React Flow nodes/edges, **optimistic updates with rollback** on API failure  |
| `ai-store`     | Active model, AI settings                                                    |
| `chat-store`   | Chat/conversation state                                                      |
| `wizard-store` | Canvas setup wizard state                                                    |

**Auth pattern:** Access token in memory only (cleared on reload). User object in localStorage. On hydration, `useAuth` hook restores session via refresh token cookie.

### Data Fetching

- `ApiClient` class with interceptor pipeline: auth header → CSRF token → 401 refresh retry
- API modules: `auth.ts`, `canvas.ts`, `conversations.ts`, `dialogue.ts`, `ai.ts`
- Query key factory in `src/lib/query-keys.ts`
- Hooks: `use-auth`, `use-canvas`, `use-conversations`, `use-conversation-stream`, `use-dialogue`, `use-sessions`

### UI Stack

- **Canvas visualization:** XyFlow/React v12
- **UI primitives:** Radix UI (Dialog, Dropdown, Tabs, Tooltip, etc.)
- **Animations:** Framer Motion v12, Three.js + React Three Fiber
- **Styling:** Tailwind CSS v4 + custom Japandi aesthetic (`japandi.css`)
- **Forms:** React Hook Form v7 + Zod v4
- **Notifications:** Sonner
- **Theme:** next-themes (light/dark/system), Geist Sans + Geist Mono fonts

---

## MCP Server

**Location:** `mukti-mcp-server/` (standalone, not in Nx workspace)

Exposes Socratic reasoning as MCP tools via stdio transport:

- `socratic_inquiry(query, queryType, technique)` — generates questions + hints + resources
- `explore_paths(queryType)` — structured exploration paths
- `explain_approach()` — Mukti philosophy explanation

---

## RFCs (In Progress)

**RFC-0001: Knowledge Gap Detection** — BKT-based system to detect when Socratic questioning fails due to missing foundational knowledge. Multi-signal detection (behavioral, linguistic, temporal). Partially implemented in `KnowledgeTracingModule`.

**RFC-0002: Adaptive Scaffolding** — 5 scaffold levels (Level 0 = pure Socratic → Level 4 = direct instruction with guided practice). Auto-fading on consecutive success/failure. Schema fields already exist on `NodeDialogue`: `currentScaffoldLevel`, `consecutiveSuccesses`, `consecutiveFailures`, `scaffoldHistory`.

---

## Code Quality & Git Workflow

### Commits

Always use the commit tools:

```bash
git add .
bun run commit          # Interactive guided commits (czg)
bun run ai:commit       # AI-generated commit message (OpenCommit)
```

### Pre-commit Hooks (Husky + lint-staged)

1. Prettier on `*.{ts,tsx,js,jsx,json,css,md,html}`
2. `bun nx affected --target=lint --fix`
3. `bun nx affected --target=format`
4. Commitlint validates message format

### Commit Format

```
<type>(<scope>): <subject>
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, wip, init
**Scopes:** api, web, mcp-server, config, ci, deps, docker, deployment, monorepo, docs, readme, db, redis, ui, components, styles, test, e2e, release

### Formatting Rules

- Line width: 100 chars | Quotes: single | Indent: 2 spaces | Semicolons: required | Trailing commas: ES5

## Testing

```bash
bun nx run @mukti/api:test           # All tests
bun nx run @mukti/api:test:watch     # Watch mode
bun nx run @mukti/api:test:cov       # With coverage
bun nx run @mukti/api:test:e2e       # E2E tests
```

Property-based tests: `__tests__/properties/*.property.spec.ts` using fast-check.

## Quick Reference

- **Nx version:** 21.6.3 | **Parallel tasks:** 3 | **Cache:** `.nx/cache`
- **Clear cache:** `bun nx reset`
- **Visualize deps:** `bun run graph`
- **Production domain:** `mukti.chat`
