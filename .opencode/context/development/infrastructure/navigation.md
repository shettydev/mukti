<!-- Context: development/infrastructure/navigation | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Infrastructure Navigation — Mukti

**Purpose**: Nx monorepo commands, Bun runtime, and Docker infrastructure for Mukti

---

## Structure

```
development/infrastructure/
├── navigation.md
├── nx-bun.md       # Nx workspace commands, Bun runtime, project targets
└── docker.md       # Docker Compose services, env vars, startup order
```

---

## Quick Routes

| Task                              | Path        |
| --------------------------------- | ----------- |
| **Run dev servers**               | `nx-bun.md` |
| **Nx commands (build/test/lint)** | `nx-bun.md` |
| **Affected-only builds (CI)**     | `nx-bun.md` |
| **Start local databases**         | `docker.md` |
| **Environment variables**         | `docker.md` |
| **Full stack Docker run**         | `docker.md` |

---

## TL;DR

```bash
# Start local infra (dev mode)
docker compose up mongodb redis -d

# Start apps
bun nx run @mukti/api:serve
bun nx run @mukti/web:dev

# Run tests
bun nx run @mukti/api:test
```

---

## Related Context

- **NestJS patterns** → `../backend/nestjs-patterns.md`
- **Core Standards** → `../../core/standards/code-quality.md`
