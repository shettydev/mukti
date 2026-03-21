<!-- Context: core/navigation | Priority: critical | Version: 2.0 | Updated: 2026-03-21 -->

# Context Navigation

**Mukti Monorepo** — NestJS 11 API + Next.js 15 Frontend

---

## Structure

```
.claude/context/
├── CODEBASE_STANDARDS.md       # Naming, imports, TypeScript, testing, git
├── core/                       # Universal standards & workflows
├── development/                # Software development (all stacks)
├── project/                    # Mukti-specific patterns
│   ├── mukti-api-patterns.md   # NestJS API design guide
│   └── mukti-web-patterns.md   # Next.js frontend patterns
├── ui/                         # Visual design & UX
├── data/                       # Data engineering
├── product/                    # Product management
└── project-intelligence/       # Domain knowledge
```

---

## Quick Routes

| Task                         | Path                                 |
| ---------------------------- | ------------------------------------ |
| **Naming & imports**         | `CODEBASE_STANDARDS.md`              |
| **Build a NestJS module**    | `project/mukti-api-patterns.md`      |
| **Write API endpoint**       | `project/mukti-api-patterns.md` §2-4 |
| **Make API call (TanStack)** | `project/mukti-web-patterns.md` §1   |
| **Create Zustand store**     | `project/mukti-web-patterns.md` §3   |
| **Build a component**        | `project/mukti-web-patterns.md` §4   |
| **Form with validation**     | `project/mukti-web-patterns.md` §4.2 |
| **TDD & testing overview**   | `CODEBASE_STANDARDS.md` §6           |
| **Backend tests (NestJS)**   | `project/mukti-api-patterns.md` §10  |
| **Frontend tests (React)**   | `project/mukti-web-patterns.md` §7   |
| **Code quality**             | `core/standards/code-quality.md`     |
| **Code review**              | `core/workflows/code-review.md`      |

---

## By Category

**CODEBASE_STANDARDS.md** — Naming, file structure, imports, TypeScript, error handling, testing, formatting, git
**project/** — Mukti-specific: API patterns, frontend patterns, domain context
**core/** — Universal standards, workflows → `core/navigation.md`
**development/** — Cross-stack development → `development/navigation.md`
**ui/** — Design & UX → `ui/navigation.md`
**project-intelligence/** — Domain knowledge → `project-intelligence/navigation.md`
