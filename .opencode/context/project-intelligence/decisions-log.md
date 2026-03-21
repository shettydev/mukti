<!-- Context: project-intelligence/decisions | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Decisions Log

**Purpose**: Record major architectural decisions with rationale to prevent "why was this done?" debates.
**Last Updated**: 2026-03-21

## Quick Reference

- **Format**: Each decision as a dated entry with context, rationale, and trade-offs
- **Status**: Decided | Pending | Under Review | Deprecated

---

## Decision: Bun as Runtime and Package Manager

**Date**: 2025-Q4 | **Status**: Decided

**Context**: Node.js + npm required explicit dotenv loading and slower installs across all scripts.

**Decision**: Bun as the universal runtime and package manager for the entire monorepo.

**Rationale**: Auto-loads `.env` files (no dotenv imports); ~25x faster installs; native TypeScript execution in scripts (`bun <file>` vs `ts-node`); `bun run` replaces `npm run`.

**Trade-offs**: Bun ecosystem less mature than Node.js; some npm packages need compatibility shims. Accepted — speed and DX benefits outweigh occasional edge cases.

---

## Decision: NestJS 11 over Express for the API

**Date**: 2025-Q4 | **Status**: Decided

**Context**: Needed a modular, testable backend with dependency injection and decorator-based routing for a complex multi-module system.

**Decision**: NestJS 11 with strict module-per-feature architecture (one folder per domain, one module per concern).

**Rationale**: Built-in DI container (services injected, not globally imported); decorator-based guards, pipes, interceptors; first-class `@nestjs/swagger` support; `@nestjs/testing` enables proper isolated unit + integration tests.

**Trade-offs**: More boilerplate than Express. Justified: 12 modules with shared services would be tangled in Express without a DI layer.

---

## Decision: MongoDB + Mongoose over PostgreSQL

**Date**: 2025-Q4 | **Status**: Decided

**Context**: Canvas sessions have nested node structures; dialogue messages are append-only arrays; knowledge states are per-user-per-concept documents.

**Decision**: MongoDB 7 with Mongoose 8. All schemas registered centrally via `ALL_SCHEMAS` in `src/schemas/index.ts`.

**Rationale**: Document model fits hierarchical canvas/dialogue data without JOIN complexity; Mongoose population handles cross-document references; schema-per-concept keeps the domain model explicit.

**Trade-offs**: No ACID transactions across documents (compensated by schema design and optimistic updates on the client). No complex relational queries needed.

---

## Decision: Queue-Based AI Processing (BullMQ + SSE)

**Date**: 2025-Q4 | **Status**: Decided

**Context**: AI inference via OpenRouter/Gemini takes 2–15s; standard HTTP requests time out; inline AI calls block the event loop.

**Decision**: POST message → 202 Accepted + `{ jobId, position }` → client subscribes to SSE stream for real-time response. SSE events: `processing → message → complete | error`.

**Rationale**: Non-blocking API; queue position gives users real-time feedback; SSE enables token-by-token streaming; BullMQ handles retries and failure cases. Connections keyed by `sessionId:nodeId` for per-node dialogue isolation.

**Trade-offs**: Two-step client flow (POST then SSE subscribe). Documented as the expected pattern; both ConversationsModule and DialogueModule follow it consistently.

---

## Decision: Nx Monorepo with Shared Config

**Date**: 2025-Q4 | **Status**: Decided

**Context**: `@mukti/api` and `@mukti/web` are developed together but built/deployed independently. Need shared TypeScript config, lint rules, and task orchestration.

**Decision**: Nx 21.6 with `@nx/next`, `@nx/eslint`, `@nx/jest` plugins; shared `tsconfig.base.json`; parallel task execution (3 concurrent); affected commands for CI.

**Rationale**: `bun run affected:test` only tests changed packages; `.nx/cache` skips unchanged builds; `bun run graph` visualizes dependencies. Critical for monorepo scale.

**Trade-offs**: Nx learning curve and plugin-based config complexity. Worth it: affected commands alone reduce CI time by ~60% on partial changes.

---

## Decision: Global JWT Guard with `@Public()` Opt-Out

**Date**: 2025-Q4 | **Status**: Decided

**Context**: Every new NestJS endpoint must be authenticated. Developer error (forgetting a guard) should never create an accidental public endpoint.

**Decision**: `JwtAuthGuard` registered globally via `APP_GUARD` in `AppModule`. Developers use `@Public()` decorator explicitly to opt out on open endpoints (waitlist, OAuth callbacks, health check).

**Rationale**: Secure by default — new controllers can't accidentally be public. Consistent with `@Roles()` + `RolesGuard` layered on top. Prevents security regressions.

**Trade-offs**: Developers must consciously add `@Public()`. Considered a feature, not a bug — forced intentionality on auth decisions.

---

## Decision: BYOK (Bring Your Own Key) AI Model

**Date**: 2026-Q1 | **Status**: Decided

**Context**: Platform-funded AI inference doesn't scale with growth. Power users want to choose their own models beyond the platform default.

**Decision**: Users store encrypted OpenRouter/Gemini API keys in their account settings. `AiPolicyService.resolveEffectiveModel()` determines which key and model to use per request. Platform default: `openai/gpt-5-mini`.

**Rationale**: Shifts AI inference cost to users who opt in; power users get model choice (GPT-4, Claude, Gemini); `AiSecretsService` encrypts keys at rest. Platform cost becomes near-zero for BYOK users.

**Trade-offs**: Users must obtain and manage their own API keys. Mitigated by clear UX in settings and sensible platform default for free-tier users.

---

## Deprecated Decisions

| Decision                     | Date       | Replaced By                                | Why                                               |
| ---------------------------- | ---------- | ------------------------------------------ | ------------------------------------------------- |
| `project/project-context.md` | 2026-01-12 | `project-intelligence/technical-domain.md` | Was generic OpenCode template, not Mukti-specific |

## Related Files

- `technical-domain.md` — Technical implementation affected by these decisions
- `business-tech-bridge.md` — Business rationale for technical choices
- `living-notes.md` — Current open questions that may become decisions
