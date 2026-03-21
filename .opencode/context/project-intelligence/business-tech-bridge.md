<!-- Context: project-intelligence/bridge | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Business ↔ Tech Bridge

**Purpose**: Show how Mukti's product philosophy drives every technical decision.
**Last Updated**: 2026-03-21

## Quick Reference

- **Purpose**: Connect "why we build it" to "how we build it"
- **Update When**: New features ship, architecture changes, business pivot
- **Audience**: Developers needing context, stakeholders evaluating trade-offs

## Core Mapping

| Business Need                        | Technical Solution                          | Business Value                                   |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------ |
| Real-time Socratic response          | BullMQ queue + SSE streaming                | Users aren't blocked; see progress in real-time  |
| Visual thinking canvas               | XyFlow/React + Zustand optimistic updates   | Fluid canvas editing without API lag             |
| Dialogue quality (one question only) | DialogueQualityModule (7 services)          | Socratic contract never broken                   |
| Knowledge gap detection              | BKT algorithm in KnowledgeTracingModule     | Method doesn't fail on unfamiliar concepts       |
| Adaptive scaffolding                 | 5-level ScaffoldingModule + auto-fading     | Always-appropriate difficulty, no direct answers |
| User AI cost control                 | BYOK + AiSecretsService encryption          | Sustainable scale; power user flexibility        |
| Security by default                  | Global `JwtAuthGuard` + `@Public()` opt-out | Zero accidental public endpoints                 |

## Feature Mapping

### Socratic Conversations

**Business**: Users need guided questioning that never gives direct answers
**Technical**: POST message → BullMQ enqueue → SSE stream (`processing → message → complete`)
**Why**: AI inference is 2–15s; queue-based approach keeps the API non-blocking and provides position feedback
**Trade-off chosen**: Two-step client flow (POST then SSE subscribe) over simpler long-poll; worth it for reliability and real-time streaming

---

### Thinking Canvas

**Business**: Externalizing thought structure (Seed/Soil/Root/Insight) aids metacognition
**Technical**: XyFlow node graph + Zustand optimistic updates with rollback on API failure
**Why**: Canvas interactions demand immediate UI feedback; API failures must not lose work
**Trade-off chosen**: Optimistic update complexity over blocking UI; canvas UX is core to the product promise

---

### Dialogue Quality Guardrails (RFC-0004)

**Business**: Socratic dialogue must ask exactly one question and detect when users break through
**Technical**: `DialogueQualityModule` — `SingleQuestionEnforcer`, `BreakthroughDetector`, `MisconceptionDetector`, `AcknowledgmentProtocol`, `ConclusionDetector`, `PostResponseMonitor`, `DialogueQualityService`
**Why**: Without guardrails, LLMs drift toward lecturing, which breaks Mukti's core promise
**Trade-off chosen**: Additional AI passes (token cost) over degraded Socratic quality — non-negotiable

---

### Knowledge Gap Detection (RFC-0001)

**Business**: Socratic questioning fails when users lack foundational knowledge — frustrates instead of enlightens
**Technical**: BKT (Bayesian Knowledge Tracing) + multi-signal detection (behavioral, linguistic, temporal)
**Why**: Persistent Socratic questioning on a topic the user genuinely doesn't know is cruel, not educational
**Trade-off chosen**: Bayesian complexity over simple heuristics; accuracy matters for user trust

---

### Adaptive Scaffolding (RFC-0002)

**Business**: Different users need different levels of support — pure Socratic isn't always enough
**Technical**: 5 scaffold levels (0 = pure Socratic → 4 = direct instruction + guided practice); auto-fades on consecutive success/failure streaks
**Why**: One-size-fits-all Socratic approach loses beginners; adaptive system preserves the anti-answer philosophy at every level
**Trade-off chosen**: Schema fields (`currentScaffoldLevel`, `consecutiveSuccesses`) over simpler prompt switching; explicit state enables fade logic

## Key Trade-offs Log

| Situation            | Business Priority       | Technical Priority | Decision Made          | Rationale                                          |
| -------------------- | ----------------------- | ------------------ | ---------------------- | -------------------------------------------------- |
| AI response speed    | User experience         | System reliability | Queue + SSE            | Reliability + position tracking > raw speed        |
| Auth token storage   | Frictionless login      | XSS security       | Memory-only + cookie   | Security non-negotiable; silent refresh handles UX |
| AI cost at scale     | Platform sustainability | Feature richness   | BYOK model             | Shifts inference cost to power users               |
| Canvas edit feedback | Instant UI              | Data consistency   | Optimistic + rollback  | UX wins; rollback preserves correctness            |
| Socratic quality     | Product integrity       | Token cost         | Quality guardrail pass | Product promise > incremental AI cost              |

## 📂 Codebase References

| Reference        | Path                                                                                 | Description                     |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------- |
| Queue service    | `packages/mukti-api/src/modules/conversations/services/queue.service.ts`             | BullMQ enqueue logic            |
| SSE streaming    | `packages/mukti-api/src/modules/conversations/services/stream.service.ts`            | SSE event delivery              |
| Canvas store     | `packages/mukti-web/src/lib/stores/canvas-store.ts`                                  | Optimistic updates + rollback   |
| Dialogue quality | `packages/mukti-api/src/modules/dialogue-quality/services/`                          | 7 quality guardrail services    |
| BKT algorithm    | `packages/mukti-api/src/modules/knowledge-tracing/services/bkt-algorithm.service.ts` | Bayesian knowledge tracing      |
| Scaffolding      | `packages/mukti-api/src/modules/scaffolding/services/`                               | 5-level adaptive scaffold       |
| BYOK encryption  | `packages/mukti-api/src/modules/ai/services/ai-secrets.service.ts`                   | API key encryption at rest      |
| Model resolution | `packages/mukti-api/src/modules/ai/services/ai-policy.service.ts`                    | `resolveEffectiveModel()` logic |

## Related Files

- `business-domain.md` — Business needs in full detail
- `technical-domain.md` — Technical implementation in full detail
- `decisions-log.md` — Decisions with complete rationale
