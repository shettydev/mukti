<!-- Context: development/navigation | Priority: low | Version: 2.0 | Updated: 2026-03-21 -->

# Backend Development Navigation — Mukti API

**Scope**: `@mukti/api` — NestJS 11, MongoDB, BullMQ, SSE, Auth

---

## Structure

```
development/backend/
├── navigation.md
├── nestjs-patterns.md        # Module/controller/service/guard patterns
└── queue-sse-pattern.md      # BullMQ + SSE async AI processing
```

---

## Quick Routes

| Task                               | Path                                                    |
| ---------------------------------- | ------------------------------------------------------- |
| **NestJS module structure**        | `backend/nestjs-patterns.md`                            |
| **Controller + response envelope** | `backend/nestjs-patterns.md`                            |
| **Guards + decorators**            | `backend/nestjs-patterns.md`                            |
| **DTOs + class-validator**         | `backend/nestjs-patterns.md`                            |
| **BullMQ queue + 202 pattern**     | `backend/queue-sse-pattern.md`                          |
| **SSE streaming**                  | `backend/queue-sse-pattern.md`                          |
| **Mongoose schemas**               | `data/mongoose-patterns.md`                             |
| **ALL_SCHEMAS registry**           | `data/mongoose-patterns.md`                             |
| **OpenRouter / Gemini AI**         | `integration/openrouter-gemini.md`                      |
| **BYOK key management**            | `integration/openrouter-gemini.md`                      |
| **API design conventions**         | `principles/api-design.md`                              |
| **Nx / Docker commands**           | `infrastructure/nx-bun.md` + `infrastructure/docker.md` |

---

## By Approach

**REST API** → `principles/api-design.md` (conventions) + `backend/nestjs-patterns.md` (implementation)  
**Async AI** → `backend/queue-sse-pattern.md` (queue + SSE)

## By Module

All 12 modules: `ai`, `auth`, `canvas`, `conversations`, `database`, `dialogue`, `dialogue-quality`, `health`, `knowledge-tracing`, `scaffolding`, `thought-map`, `waitlist`  
Location: `packages/mukti-api/src/modules/`

## By Concern

**Authentication** → JWT global guard, `@Public()`, `@CurrentUser()` — `backend/nestjs-patterns.md`  
**Data layer** → `data/mongoose-patterns.md`  
**AI providers** → `integration/openrouter-gemini.md`  
**Infrastructure** → `infrastructure/nx-bun.md` + `infrastructure/docker.md`

---

## Related Context

- **API Design Principles** → `principles/api-design.md`
- **Core Standards** → `../core/standards/code-quality.md`
- **Data Patterns** → `data/mongoose-patterns.md`
