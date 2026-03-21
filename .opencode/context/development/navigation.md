<!-- Context: development/navigation | Priority: critical | Version: 2.0 | Updated: 2026-03-21 -->

# Development Navigation — Mukti

**Purpose**: Software development across `@mukti/api` (NestJS) and `@mukti/web` (Next.js)

---

## Structure

```
development/
├── navigation.md
├── ui-navigation.md           # Frontend quick reference
├── backend-navigation.md      # Backend quick reference
├── fullstack-navigation.md    # End-to-end workflows
│
├── principles/                # Universal practices
│   ├── navigation.md
│   ├── clean-code.md          # ✅ Complete
│   └── api-design.md          # ✅ Complete — Mukti NestJS API conventions
│
├── frameworks/                # Framework index
│   └── navigation.md          # ✅ Updated — NestJS + Next.js
│
├── ai/                        # AI provider integration
│   └── navigation.md          # ✅ Updated — OpenRouter/Gemini (Mastra removed)
│
├── frontend/                  # Client-side patterns
│   ├── navigation.md
│   ├── when-to-delegate.md    # ✅ Updated — Next.js 15 / React 19 patterns
│   └── react/
│       ├── navigation.md
│       └── react-patterns.md
│
├── backend/                   # Server-side patterns
│   ├── navigation.md          # ✅ Updated
│   ├── nestjs-patterns.md     # ✅ New — Module/controller/service/guard
│   └── queue-sse-pattern.md   # ✅ New — BullMQ + SSE async AI processing
│
├── data/                      # Data layer
│   ├── navigation.md          # ✅ Updated
│   └── mongoose-patterns.md   # ✅ New — Mongoose schemas, ALL_SCHEMAS, queries
│
├── integration/               # External integrations
│   ├── navigation.md          # ✅ Updated
│   └── openrouter-gemini.md   # ✅ New — OpenRouter + Gemini SDKs, BYOK
│
└── infrastructure/            # Monorepo + DevOps
    ├── navigation.md          # ✅ Updated
    ├── nx-bun.md              # ✅ New — Nx commands, Bun runtime
    └── docker.md              # ✅ New — Docker Compose, env vars
```

---

## Quick Routes

| Task                           | Path                               |
| ------------------------------ | ---------------------------------- |
| **Frontend (Next.js)**         | `ui-navigation.md`                 |
| **Backend (NestJS)**           | `backend-navigation.md`            |
| **Full-stack workflows**       | `fullstack-navigation.md`          |
| **NestJS module patterns**     | `backend/nestjs-patterns.md`       |
| **BullMQ + SSE AI processing** | `backend/queue-sse-pattern.md`     |
| **Mongoose schemas**           | `data/mongoose-patterns.md`        |
| **OpenRouter / Gemini AI**     | `integration/openrouter-gemini.md` |
| **Nx / Bun commands**          | `infrastructure/nx-bun.md`         |
| **Docker services + env vars** | `infrastructure/docker.md`         |
| **API design conventions**     | `principles/api-design.md`         |
| **Clean code**                 | `principles/clean-code.md`         |
| **React / Next.js patterns**   | `frontend/when-to-delegate.md`     |

---

## By Concern

**Principles** → Universal coding practices (clean code, API conventions)  
**Backend** → NestJS modules, guards, BullMQ queues, SSE streaming  
**Data** → MongoDB/Mongoose schemas, queries, ALL_SCHEMAS registry  
**Integration** → OpenRouter/Gemini SDKs, BYOK key management  
**Frontend** → Next.js 15 App Router, Zustand, TanStack Query, React Flow  
**Infrastructure** → Nx workspace, Bun runtime, Docker Compose

---

## Related Context

- **Core Standards** → `../core/standards/navigation.md`
- **UI Patterns** → `../ui/navigation.md`
- **Project Intelligence** → `../project-intelligence/navigation.md`
