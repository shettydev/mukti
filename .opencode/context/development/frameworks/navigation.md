<!-- Context: development/frameworks/navigation | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Frameworks Navigation — Mukti

**Purpose**: Core framework patterns for NestJS (backend) and Next.js (frontend) in Mukti

---

## Structure

```
development/frameworks/
└── navigation.md     # This file — framework index
```

Framework-specific patterns live in their respective directories:

```
development/backend/nestjs-patterns.md    # NestJS 11 patterns
development/frontend/react/               # React + Next.js 15 patterns
```

---

## Quick Routes

| Framework      | Path                                  |
| -------------- | ------------------------------------- |
| **NestJS 11**  | `../backend/nestjs-patterns.md`       |
| **Next.js 15** | `../frontend/react/react-patterns.md` |
| **React 19**   | `../frontend/react/react-patterns.md` |

---

## By Framework

**NestJS 11** → Module/controller/service/guard patterns, BullMQ queues, SSE streaming.  
See `../backend/nestjs-patterns.md` and `../backend/queue-sse-pattern.md`.

**Next.js 15** → App Router, Server/Client Components, TanStack Query, Zustand stores.  
See `../frontend/react/react-patterns.md`.

---

## Related Context

- **Backend patterns** → `../backend/navigation.md`
- **Frontend patterns** → `../frontend/navigation.md`
- **Full-stack guide** → `../fullstack-navigation.md`
