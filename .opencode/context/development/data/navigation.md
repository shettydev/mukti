<!-- Context: development/data/navigation | Priority: critical | Version: 2.0 | Updated: 2026-03-21 -->

# Data Layer Navigation — Mukti

**Purpose**: MongoDB + Mongoose patterns for `@mukti/api`

---

## Structure

```
development/data/
├── navigation.md
└── mongoose-patterns.md      # Schema definitions, ALL_SCHEMAS, querying
```

---

## Quick Routes

| Task                              | Path                   |
| --------------------------------- | ---------------------- |
| **Mongoose schema definition**    | `mongoose-patterns.md` |
| **ALL_SCHEMAS registry**          | `mongoose-patterns.md` |
| **Query patterns (find, update)** | `mongoose-patterns.md` |
| **Embedded documents**            | `mongoose-patterns.md` |
| **Canvas node IDs**               | `mongoose-patterns.md` |
| **Schema inventory (25 schemas)** | `mongoose-patterns.md` |

---

## Key Facts

- Database: **MongoDB 7** (Docker, port 27017, db: `mukti`)
- ODM: **Mongoose 8.19.1** via `@nestjs/mongoose`
- All schemas registered in `packages/mukti-api/src/schemas/index.ts` → `ALL_SCHEMAS`
- Schema classes use `@Schema`, `@Prop` decorators; types use `SchemaFactory.createForClass()`
- Sensitive fields use `select: false` (`password`, `openRouterApiKeyEncrypted`, etc.)

---

## Related Context

- **NestJS patterns** → `../backend/nestjs-patterns.md`
- **Core Standards** → `../../core/standards/code-quality.md`
