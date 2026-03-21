<!-- Context: project-intelligence/technical | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Technical Domain

> How Mukti is built — stack, architecture, and key technical decisions.

## Primary Stack

| Layer         | Technology     | Version | Rationale                                          |
| ------------- | -------------- | ------- | -------------------------------------------------- |
| Language      | TypeScript     | 5.x     | Type safety across full stack                      |
| Runtime       | Bun            | Latest  | Fast package management, auto .env loading         |
| Backend       | NestJS         | 11      | Modular architecture, decorator-based DI           |
| Frontend      | Next.js        | 15.4    | App Router, RSC, SSR                               |
| UI Framework  | React          | 19.1    | Component model, ecosystem                         |
| Database      | MongoDB        | 7       | Flexible document schemas for canvas/dialogue data |
| Cache/Queue   | Redis + BullMQ | 7 / 5   | Job queuing for AI responses, SSE streaming        |
| State         | Zustand        | 5       | Simple, performant client state                    |
| Data Fetching | TanStack Query | v5      | Cache, mutations, optimistic updates               |
| Canvas        | XyFlow/React   | v12     | Node-based graph visualization                     |
| Monorepo      | Nx             | 21.6    | Task orchestration, affected builds                |

## Architecture Pattern

```
Type: Monorepo (Nx workspace)
Pattern: Two-package fullstack — API (NestJS) + Web (Next.js)
Transport: REST + SSE (Server-Sent Events for AI streaming)
```

### Why This Architecture?

- **Monorepo**: Shared types, atomic changes across API + Web, single CI pipeline
- **NestJS**: Enterprise-grade DI, guards, interceptors, queue integration (BullMQ)
- **Next.js App Router**: Server components for public pages, client components for interactive canvas
- **BullMQ + SSE**: AI responses are slow — queue ensures fair processing, SSE streams results in real-time

## Project Structure

```
mukti/
├── packages/mukti-api/        # @mukti/api — NestJS 11 backend (port 3000)
├── packages/mukti-web/        # @mukti/web — Next.js 15 frontend (port 3001)
├── mukti-mcp-server/          # Standalone MCP server (not in Nx)
├── docs/rfcs/                 # RFC-0001 (Knowledge Gap), RFC-0002 (Scaffolding)
└── scripts/                   # AI commit, deploy scripts
```

## Integration Points

| System         | Purpose                                       | Protocol   | Direction |
| -------------- | --------------------------------------------- | ---------- | --------- |
| OpenRouter API | AI model access (multi-provider)              | REST       | Outbound  |
| Google Gemini  | Alternative AI provider                       | REST       | Outbound  |
| MongoDB 7      | Primary data store (users, canvas, dialogues) | Mongoose 8 | Internal  |
| Redis 7        | BullMQ job queue + caching                    | BullMQ 5   | Internal  |
| Google OAuth   | Social login                                  | OAuth 2.0  | Inbound   |

## Key Technical Decisions

| Decision                     | Rationale                                     | Impact                                      |
| ---------------------------- | --------------------------------------------- | ------------------------------------------- |
| Bun over npm                 | Faster installs, auto .env, native TypeScript | Simpler tooling                             |
| BullMQ + SSE over WebSockets | Reliable job queue, one-directional streaming | Simpler architecture, better error recovery |
| BYOK encryption              | Users store encrypted API keys                | Reduced infrastructure cost                 |
| Mongoose over Prisma         | Better fit for MongoDB document patterns      | Flexible schemas                            |
| Zustand over Redux           | Simpler API, less boilerplate                 | Faster development                          |
| XyFlow for canvas            | Mature node-graph library, handles layout     | Interactive canvas with drag/drop           |

See `decisions-log.md` for full decision history with alternatives.

## Development Environment

```
Setup: bun install
Requirements: Bun, Docker (for MongoDB + Redis)
Local Dev: bun run dev (starts API + Web)
API Dev: bun nx run @mukti/api:serve
Web Dev: bun nx run @mukti/web:dev
Testing: bun nx run @mukti/api:test
Infrastructure: docker compose up (MongoDB 7 + Redis 7)
```

## Deployment

```
Production Domain: mukti.live
API: Port 3000, prefix /api/v1
Web: Port 3001
Docs: /api/docs (Swagger), /api/reference (Scalar)
```

## Related Files

- `business-domain.md` — Why this technical foundation exists
- `business-tech-bridge.md` — How business needs map to technical solutions
- `decisions-log.md` — Full decision history with context
