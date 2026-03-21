<!-- Context: development/navigation | Priority: low | Version: 2.0 | Updated: 2026-03-21 -->

# Full-Stack Development Navigation — Mukti

**Scope**: End-to-end development across `@mukti/api` (NestJS) and `@mukti/web` (Next.js)

---

## Mukti Stack

```
Frontend:  packages/mukti-web/   — Next.js 15.4, React 19.1, Zustand 5, TanStack Query v5
Backend:   packages/mukti-api/   — NestJS 11, Mongoose 8, BullMQ 5, Redis 7
Database:  MongoDB 7             — Docker, port 27017, db: mukti
Queue:     Redis 7               — Docker, port 6379
AI:        OpenRouter + Gemini   — Direct SDKs, no agent frameworks
```

---

## Common Workflows

### New API Endpoint

1. `principles/api-design.md` → check response envelope + HTTP status conventions
2. `backend/nestjs-patterns.md` → module/controller/service pattern, DTO, Swagger isolation
3. `data/mongoose-patterns.md` → schema + query patterns if touching DB

### New AI-Powered Feature

1. `backend/queue-sse-pattern.md` → POST → 202 → SSE architecture
2. `integration/openrouter-gemini.md` → model resolution, BYOK key handling
3. `backend/nestjs-patterns.md` → BullMQ `@Processor` + `WorkerHost` setup

### New Frontend Page / Feature

1. `frontend/when-to-delegate.md` → Server vs Client component decision, store usage
2. Check existing route patterns in `packages/mukti-web/src/app/dashboard/`
3. Use `lib/query-keys.ts` for TanStack Query keys
4. Use `lib/api/*.ts` modules for API calls via `apiClient`

### New Mongoose Schema

1. `data/mongoose-patterns.md` → `@Schema`, `@Prop`, `SchemaFactory`, virtuals
2. Add to `ALL_SCHEMAS` in `packages/mukti-api/src/schemas/index.ts`
3. Register in owning module's `MongooseModule.forFeature([...])`

### New Canvas Node Type

1. Follow node ID convention: `{type}-{index}` (e.g., `root-0`, `insight-1`)
2. `data/mongoose-patterns.md` → Canvas node ID patterns
3. Update `CanvasSessionSchema` if storing new node type

---

## Quick Routes

| Layer              | Path                           |
| ------------------ | ------------------------------ |
| **Frontend**       | `ui-navigation.md`             |
| **Backend**        | `backend-navigation.md`        |
| **Data**           | `data/navigation.md`           |
| **Integration**    | `integration/navigation.md`    |
| **Infrastructure** | `infrastructure/navigation.md` |
| **API design**     | `principles/api-design.md`     |

---

## Key Conventions

- **Bun only** — `bun install`, `bun run`, `bun nx run`. Never `npm`/`node`
- **Named exports** — no `export default` anywhere
- **Response envelope** — every API response wrapped in `{ success, data, meta }`
- **Access tokens** — memory only; refresh tokens in httpOnly cookies
- **Swagger isolation** — all decorators in `dto/feature.swagger.ts`
- **ALL_SCHEMAS** — every Mongoose schema must be registered there

---

## Related Context

- **Clean Code** → `principles/clean-code.md`
- **API Design** → `principles/api-design.md`
- **Core Standards** → `../core/standards/navigation.md`
