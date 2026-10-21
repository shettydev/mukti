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
- **Knowledge Gap Detection** (RFC-0001) — Bayesian Knowledge Tracing to detect when Socratic questioning fails; runs on every chat, canvas and map turn
- **Adaptive Scaffolding** (RFC-0002) — 5-level scaffold system that never gives direct answers; runs on every turn
- **Thought Maps** (RFC-0003) — free-form maps with per-node chat, suggested branches, and extraction from a conversation

## Repo Structure

```
├── packages/mukti-api/        # @mukti/api — NestJS 11 backend (npm: @muktiai/api)
├── packages/mukti-web/        # @mukti/web — Next.js 15 frontend (npm: @muktiai/web)
├── packages/mukti-cli/        # `npx muktiai` local launcher (npm: muktiai)
├── packages/mukti-mcp/        # Standalone MCP server (Bun workspace, not an Nx project)
├── docs/reference/            # Architecture overview and technical docs
├── docs/rfcs/                 # Design documents (RFC-0001 to RFC-0007)
└── scripts/                   # AI commit, deploy, release, local start scripts
```

Architecture overview (current): `docs/reference/architecture/overview.md`.

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

Docker Compose provides: **MongoDB 7** (port 27017, db: `mukti`), **Redis 7** (port 6379, BullMQ queues and the cross-instance SSE stream bus). API runs on port 3000, Web on port 3001. Local mode (`MUKTI_LOCAL=1`) needs neither: embedded MongoDB, inline jobs, in-process streams.

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
├── CoreModule             — MongoDB (ALL_SCHEMAS), BullMQ (QueueModule), StreamBus (Redis pub/sub or in-process)
├── AuthModule             — JWT + Google OAuth, email verification, refresh tokens
├── AiModule               — provider clients, BYOK key encryption, model policy, AiRequestGate, free quota
├── CanvasModule           — Thinking Canvas CRUD (Seed/Soil/Root/Insight nodes, relationships)
├── ConversationsModule    — Text-based Socratic sessions, BullMQ queue, SSE streaming
├── DialogueModule         — Per-node canvas dialogue, BullMQ queue, SSE streaming
├── ThoughtMapModule       — Thought maps, node dialogue, branch suggestions, conversation extraction
├── KnowledgeTracingModule — BKT; KnowledgeStateStore is the only writer of knowledge_states
├── LocalModeModule        — MUKTI_LOCAL runtime wiring
├── HealthModule           — Health check endpoint
└── WaitlistModule         — Pre-launch waitlist

Imported by the surfaces (not in AppModule directly):
SocraticTurnModule → ScaffoldingModule → KnowledgeTracingModule, DialogueQualityModule
```

### Architecture Rules

- **Every AI request passes `AiRequestGate.authorize()`** before it is enqueued. It resolves key, model and plan, and consumes a free message on the server key. New AI endpoints must call it.
- **Every Socratic turn runs `SocraticTurnEngine`** (`prepare` → model call → `inspectReply` → `settle`). Do not reimplement gap detection, quality checks or scaffold fade in a processor.
- **Only `KnowledgeStateStore` writes `knowledge_states`** (compare-and-set on `attempts`). Scaffold writes pass the `guard` from `settle` so concurrent turns cannot overwrite each other.
- **Emit SSE events through the stream services**, never to a connection directly; they publish via `StreamBus` so jobs on any instance reach the client.
- **Read another domain's data through its service**, not its model (e.g. thought maps use `ConversationService`, `CanvasService`).
- **SSE event shapes live in `src/contracts/stream-events.ts`.** The web type-checks against it; change both sides together.

### Key Patterns

- **Queue-based AI**: POST message → `{ jobId, position }` (202 Accepted) → SSE stream for real-time response. Chat, canvas node dialogue and thought-map node dialogue all use this pattern.
- **SSE events**: `processing → message → complete | error`. Chat streams are keyed by `conversationId`; node dialogue by `sessionId:nodeId` (thought maps use `map:{mapId}` as the session).
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

Email/password + Google OAuth. Access tokens in memory, refresh tokens in httpOnly cookies + DB. Refreshing returns a new access token; the refresh token itself is not rotated yet. Email verification on signup.

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
├── chat/                 # Text conversations
├── canvas/               # Thinking Canvas sessions
├── maps/                 # Thought maps (list, new, [id])
├── map/[token]/          # Public read-only shared thought map
├── settings/             # User settings (model, API key)
└── dashboard/[[...slug]] # Redirects old /dashboard/* links
```

### State Management (Zustand Stores)

| Store               | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `auth-store`        | User (persisted to localStorage), accessToken (memory-only), isAuthenticated |
| `canvas-store`      | React Flow nodes/edges, **optimistic updates with rollback** on API failure  |
| `ai-store`          | Active model, AI settings                                                    |
| `chat-store`        | Chat/conversation state                                                      |
| `wizard-store`      | Canvas setup wizard state                                                    |
| `thought-map-store` | Thought map nodes/edges and selection                                        |
| `onboarding-store`  | First-run local onboarding state                                             |

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

**Location:** `packages/mukti-mcp/` (Bun workspace package, not an Nx project, so CI and releases skip it)

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
bun run commit:ai       # AI-generated commit message (scripts/ai-commit.js)
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

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:

- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
