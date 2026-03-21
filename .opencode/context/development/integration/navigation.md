<!-- Context: development/integration/navigation | Priority: critical | Version: 2.0 | Updated: 2026-03-21 -->

# Integration Navigation — Mukti

**Purpose**: AI providers, SSE streaming, and OAuth integration patterns for Mukti

---

## Structure

```
development/integration/
├── navigation.md
└── openrouter-gemini.md    # OpenRouter SDK + Gemini SDK, BYOK, model resolution
```

---

## Quick Routes

| Task                              | Path                              |
| --------------------------------- | --------------------------------- |
| **OpenRouter / Gemini SDK usage** | `openrouter-gemini.md`            |
| **BYOK (user API keys)**          | `openrouter-gemini.md`            |
| **Model resolution logic**        | `openrouter-gemini.md`            |
| **SSE event streaming**           | `../backend/queue-sse-pattern.md` |
| **BullMQ queue setup**            | `../backend/queue-sse-pattern.md` |

---

## Key Facts

- Mukti uses **OpenRouter SDK** (`@openrouter/sdk`) and **Gemini SDK** (`@google/generative-ai`) directly
- **No agent frameworks** — no Mastra AI, LangChain, LlamaIndex, etc.
- Default model: `openai/gpt-5-mini`
- OAuth (Google): Passport.js in `AuthModule` — see `packages/mukti-api/src/modules/auth/`
- API client (web): `packages/mukti-web/src/lib/api/client.ts` — interceptor pipeline with auth + CSRF + 401 retry

---

## Related Context

- **Queue + SSE** → `../backend/queue-sse-pattern.md`
- **NestJS patterns** → `../backend/nestjs-patterns.md`
- **Core Standards** → `../../core/standards/code-quality.md`
