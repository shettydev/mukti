<!-- Context: development/backend/navigation | Priority: critical | Version: 2.0 | Updated: 2026-03-21 -->

# Backend Development Navigation — Mukti API

**Purpose**: NestJS 11 backend patterns for `@mukti/api`

---

## Structure

```
development/backend/
├── navigation.md
├── nestjs-patterns.md         # Module/controller/service/guard patterns
└── queue-sse-pattern.md       # BullMQ + SSE async AI processing
```

---

## Quick Routes

| Task                                 | Path                                  |
| ------------------------------------ | ------------------------------------- |
| **NestJS module/controller/service** | `nestjs-patterns.md`                  |
| **BullMQ + SSE async processing**    | `queue-sse-pattern.md`                |
| **Mongoose schemas & queries**       | `../data/mongoose-patterns.md`        |
| **OpenRouter + Gemini AI**           | `../integration/openrouter-gemini.md` |
| **API design principles**            | `../principles/api-design.md`         |

---

## By Concern

**Module wiring** → `nestjs-patterns.md`  
**Controller patterns** → `nestjs-patterns.md`  
**Guards & decorators** → `nestjs-patterns.md`  
**Async AI processing** → `queue-sse-pattern.md`  
**SSE streaming** → `queue-sse-pattern.md`  
**Data layer** → `../data/mongoose-patterns.md`  
**AI integration** → `../integration/openrouter-gemini.md`

---

## Related Context

- **Mongoose Patterns** → `../data/mongoose-patterns.md`
- **OpenRouter/Gemini** → `../integration/openrouter-gemini.md`
- **Core Standards** → `../../core/standards/code-quality.md`
- **API Design** → `../principles/api-design.md`
