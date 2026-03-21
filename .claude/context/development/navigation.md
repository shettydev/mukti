<!-- Context: development/navigation | Priority: critical | Version: 1.0 | Updated: 2026-02-15 -->

# Development Navigation

**Purpose**: Software development across all stacks

---

## Structure

```
development/
├── navigation.md
├── ui-navigation.md           # Specialized
├── backend-navigation.md      # Specialized
├── fullstack-navigation.md    # Specialized
│
├── principles/                # Universal (language-agnostic)
│   ├── navigation.md
│   ├── clean-code.md
│   └── api-design.md
│
├── frameworks/                # Full-stack frameworks
│   ├── navigation.md
│   └── tanstack-start/
│
├── ai/                        # AI & Agents
│   ├── navigation.md
│   └── mastra-ai/
│
├── frontend/                  # Client-side
│   ├── navigation.md
│   ├── when-to-delegate.md    # When to use frontend-specialist
│   └── react/
│       ├── navigation.md
│       └── react-patterns.md
│
├── backend/                   # Server-side (future)
│   ├── navigation.md
│   ├── api-patterns/
│   ├── nodejs/
│   ├── python/
│   └── authentication/
│
├── data/                      # Data layer (future)
│   ├── navigation.md
│   ├── sql-patterns/
│   ├── nosql-patterns/
│   └── orm-patterns/
│
├── integration/               # Connecting systems (future)
│   ├── navigation.md
│   ├── package-management/
│   ├── api-integration/
│   └── third-party-services/
│
└── infrastructure/            # DevOps (future)
    ├── navigation.md
    ├── docker/
    └── ci-cd/
```

---

## Quick Routes

| Task                          | Path                           |
| ----------------------------- | ------------------------------ |
| **UI/Frontend**               | `ui-navigation.md`             |
| **When to delegate frontend** | `frontend/when-to-delegate.md` |
| **Backend/API**               | `backend-navigation.md`        |
| **Full-stack**                | `fullstack-navigation.md`      |
| **Clean code**                | `principles/clean-code.md`     |
| **API design**                | `principles/api-design.md`     |

---

## By Concern

**Principles** → Universal development practices
**Frameworks** → Full-stack frameworks (Tanstack Start, Next.js)
**AI** → AI frameworks and agent runtimes (MAStra AI)
**Frontend** → React patterns and component design
**Backend** → APIs, Node.js, Python, auth (future)
**Data** → SQL, NoSQL, ORMs (future)
**Integration** → Packages, APIs, services (future)
**Infrastructure** → Docker, CI/CD (future)

---

## Related Context

- **Core Standards** → `../core/standards/navigation.md`
- **UI Patterns** → `../ui/navigation.md`
