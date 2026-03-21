<!-- Context: project-intelligence/decisions | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Decisions Log

> Major architectural and business decisions with full context.

## Decision: Bun as Package Manager & Runtime

**Date**: 2025 (project inception)
**Status**: Decided

### Context

Needed a fast package manager for a monorepo with two large packages (NestJS + Next.js). npm/yarn/pnpm were options.

### Decision

Use Bun for all package management and script execution. `bun install`, `bun run`, `bun <file>`.

### Rationale

- Significantly faster installs than npm/yarn/pnpm
- Automatic `.env` file loading — no need for dotenv
- Native TypeScript execution
- Compatible with Node.js ecosystem

### Impact

- **Positive**: Faster CI, simpler env setup, no dotenv dependency
- **Negative**: Occasional compatibility issues with Node-specific packages
- **Rule**: Never use `npm`, `node`, or `dotenv` — always `bun`

---

## Decision: Socratic Method over Direct AI Answers

**Date**: 2025 (project inception)
**Status**: Decided

### Context

Building an AI-powered thinking tool. Could either give direct answers (like ChatGPT) or guide through questions.

### Decision

Mukti will never give direct answers. All AI interaction uses Socratic questioning techniques.

### Rationale

- Direct answers create cognitive dependency
- Socratic method builds transferable thinking skills
- Unique market positioning vs. every other AI tool
- Aligns with the product name: "liberation" from AI dependency

### Impact

- **Positive**: Clear product identity, genuine user skill development
- **Negative**: Higher friction, steeper learning curve, harder to demo
- **Rule**: No feature should shortcut the thinking process. If a feature gives answers, it must be wrapped in scaffolding (RFC-0002)

---

## Decision: BullMQ Queue + SSE over WebSockets

**Date**: 2025
**Status**: Decided

### Context

AI responses are slow (seconds to minutes). Need a pattern for handling concurrent requests and streaming results.

### Decision

POST message → 202 Accepted with `{ jobId, position }` → SSE stream for real-time response delivery.

### Rationale

- Queue ensures fair processing with priority (paid users get higher priority)
- SSE is simpler than WebSocket for one-directional streaming
- Built-in retry with exponential backoff (3 attempts)
- No persistent connection management needed

### Alternatives Considered

| Alternative      | Pros          | Cons                                              | Why Rejected                                 |
| ---------------- | ------------- | ------------------------------------------------- | -------------------------------------------- |
| WebSockets       | Bidirectional | Complex connection management, reconnection logic | Overkill — only need server→client streaming |
| Long polling     | Simple        | Wasteful, no progressive delivery                 | Poor UX for streaming AI responses           |
| Direct API calls | Simple        | No queuing, no fair processing                    | Can't handle concurrent load                 |

### Impact

- **Positive**: Reliable, fair, recoverable from failures
- **Negative**: Adds latency from queue overhead
- **Event sequence**: `processing → message → complete | error`

---

## Decision: BYOK (Bring Your Own Key)

**Date**: 2025
**Status**: Decided

### Context

AI API calls are expensive. Need a sustainable cost model.

### Decision

Users store encrypted OpenRouter/Gemini API keys. `AiPolicyService.resolveEffectiveModel()` resolves which key/model to use. Default model: `openai/gpt-5-mini`.

### Rationale

- Reduces infrastructure cost dramatically
- Users control their own AI spend
- Supports multiple providers (OpenRouter, Gemini)
- Encrypted storage protects keys at rest

### Impact

- **Positive**: Sustainable business model, user autonomy
- **Negative**: Onboarding friction (users need API keys), support burden
- **Risk**: Key management security is critical

---

## Decision: Nx Monorepo with Two Packages

**Date**: 2025 (project inception)
**Status**: Decided

### Context

Building a full-stack app with NestJS backend and Next.js frontend. Could use separate repos, turborepo, or Nx.

### Decision

Single Nx monorepo with `packages/mukti-api/` and `packages/mukti-web/`.

### Rationale

- Shared TypeScript types between API and Web
- Atomic changes across both packages
- Nx provides task orchestration, caching, affected builds
- Single CI/CD pipeline

### Alternatives Considered

| Alternative    | Pros                | Cons                            | Why Rejected                   |
| -------------- | ------------------- | ------------------------------- | ------------------------------ |
| Separate repos | Independent deploys | No shared types, cross-repo PRs | Too much coordination overhead |
| Turborepo      | Simpler config      | Less mature, fewer features     | Nx has better NestJS support   |

### Impact

- **Positive**: Faster development, consistent tooling, shared types
- **Negative**: Larger repo, Nx learning curve

---

## Decision: MongoDB + Mongoose over PostgreSQL + Prisma

**Date**: 2025
**Status**: Decided

### Context

Canvas sessions and dialogues have flexible, nested schemas that evolve rapidly during product development.

### Decision

MongoDB 7 with Mongoose 8 for all data persistence.

### Rationale

- Document model fits canvas nodes naturally (nested objects, arrays)
- Schema flexibility allows rapid iteration without migrations
- Mongoose decorators integrate well with NestJS
- Canvas sessions have variable structure (different node types, varying depth)

### Impact

- **Positive**: Fast iteration, natural data model for canvas/dialogue
- **Negative**: No ACID transactions across collections, manual referential integrity
- **Risk**: Data consistency requires careful service-layer validation

---

## Related Files

- `technical-domain.md` — Technical implementation affected by these decisions
- `business-tech-bridge.md` — How decisions connect business and technical
- `living-notes.md` — Current open questions that may become decisions
