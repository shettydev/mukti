<!-- Context: project/navigation | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Mukti Project Context

**Purpose**: Project-specific patterns for the Mukti monorepo.

---

## Structure

```
project/
├── navigation.md              # This file
├── mukti-api-patterns.md      # NestJS API design patterns
└── mukti-web-patterns.md      # Next.js frontend patterns
```

---

## Quick Routes

| Task                                 | Path                        |
| ------------------------------------ | --------------------------- |
| **NestJS module/controller/service** | `mukti-api-patterns.md`     |
| **DTOs & validation**                | `mukti-api-patterns.md` §4  |
| **Queue + SSE streaming**            | `mukti-api-patterns.md` §6  |
| **TanStack Query hooks**             | `mukti-web-patterns.md` §1  |
| **API client & modules**             | `mukti-web-patterns.md` §2  |
| **Zustand stores**                   | `mukti-web-patterns.md` §3  |
| **React components**                 | `mukti-web-patterns.md` §4  |
| **Tailwind + Japandi theme**         | `mukti-web-patterns.md` §5  |
| **Auth flow**                        | `mukti-web-patterns.md` §6  |
| **Backend tests (TDD)**              | `mukti-api-patterns.md` §10 |
| **Frontend tests (TDD)**             | `mukti-web-patterns.md` §7  |

---

## Related

- **Codebase Standards** → `../CODEBASE_STANDARDS.md`
- **Domain Knowledge** → `../project-intelligence/navigation.md`
