<!-- Context: development/ai/navigation | Priority: critical | Version: 2.0 | Updated: 2026-03-21 -->

# AI Integration Navigation — Mukti

**Purpose**: AI provider SDK patterns for Mukti's Socratic assistant

---

## Structure

```
development/integration/
└── openrouter-gemini.md    # OpenRouter + Gemini SDK, BYOK, model resolution
```

> **Note**: Mastra AI was removed — Mukti does NOT use Mastra AI or any agent framework.  
> All AI calls are direct SDK calls via `@openrouter/sdk` and `@google/generative-ai`.

---

## Quick Routes

| Task                          | Path                                  |
| ----------------------------- | ------------------------------------- |
| **OpenRouter / Gemini usage** | `../integration/openrouter-gemini.md` |
| **BYOK key encryption**       | `../integration/openrouter-gemini.md` |
| **AI queue processing**       | `../backend/queue-sse-pattern.md`     |
| **Model resolution**          | `../integration/openrouter-gemini.md` |

---

## Key Facts

- **SDKs**: `@openrouter/sdk`, `@google/generative-ai`
- **No frameworks**: No Mastra AI, LangChain, LlamaIndex, Vercel AI SDK
- **Default model**: `openai/gpt-5-mini` via OpenRouter
- **BYOK**: Users can bring their own OpenRouter or Gemini keys (encrypted in User schema)
- **Processing**: All AI calls happen inside BullMQ workers, not in controllers
- **Streaming**: Results streamed to clients via SSE after worker completion

---

## Related Context

- **OpenRouter + Gemini details** → `../integration/openrouter-gemini.md`
- **Queue + SSE pattern** → `../backend/queue-sse-pattern.md`
- **Core Standards** → `../../core/standards/code-quality.md`
