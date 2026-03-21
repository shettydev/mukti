<!-- Context: project-intelligence/bridge | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Business ↔ Tech Bridge

> How Mukti's business needs translate to technical solutions.

## Core Mapping

| Business Need                           | Technical Solution                              | Why This Mapping                                                          | Business Value                                   |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
| Socratic questioning that feels natural | BullMQ queue + SSE streaming                    | AI responses are slow — queue ensures fairness, SSE streams progressively | Users see thinking unfold in real-time           |
| Visual problem decomposition            | XyFlow/React canvas with typed nodes            | Node graph captures Seed/Soil/Root/Insight relationships                  | Users see their thinking structure               |
| Per-node conversations                  | NodeDialogue schema + technique auto-selection  | Each node type maps to a Socratic technique                               | Contextual questioning without manual setup      |
| Detect when Socratic method fails       | Bayesian Knowledge Tracing (RFC-0001)           | Multi-signal detection (behavioral, linguistic, temporal)                 | Prevents frustration from unanswerable questions |
| Never give direct answers               | 5-level scaffold system (RFC-0002)              | Graduated support that auto-fades on success                              | Users build independence, not dependency         |
| Affordable AI access                    | BYOK (Bring Your Own Key) encryption            | Users store encrypted API keys, resolved by AiPolicyService               | Reduces infrastructure cost, user controls spend |
| Secure authentication                   | JWT access (memory) + refresh (httpOnly cookie) | Token rotation, email verification, Google OAuth                          | Security without UX friction                     |

## Feature Mapping

### Feature: Thinking Canvas

**Business Context**:

- User need: Decompose complex problems visually
- Business goal: Differentiate from text-only AI tools
- Priority: Core product — the primary interaction surface

**Technical Implementation**:

- Solution: XyFlow/React v12 with custom node types (Seed, Soil, Root, Insight)
- Architecture: Canvas state in Zustand with optimistic updates, API persistence via Mongoose
- Trade-offs: Chose XyFlow over D3 for built-in interaction handling; chose Zustand over Redux for simpler canvas state

**Connection**: The canvas is Mukti's visual identity. Without it, Mukti is just another chatbot. The node-based structure enforces the Socratic framework (problem → constraints → assumptions → insights).

### Feature: Socratic Conversations + Node Dialogues

**Business Context**:

- User need: Guided thinking through questions, not answers
- Business goal: Build thinking skills, not AI dependency
- Priority: Core product — the primary value delivery mechanism

**Technical Implementation**:

- Solution: Two parallel systems — text conversations (ConversationsModule) and per-node dialogues (DialogueModule)
- Architecture: Both use BullMQ queue → SSE streaming pattern. Technique auto-selected by node type (seed→maieutics, root→elenchus, soil→counterfactual, insight→dialectic)
- Trade-offs: Queue-based over direct API calls — adds latency but ensures fair processing and error recovery

**Connection**: The SSE streaming creates a "thinking alongside you" experience. The auto-selected technique ensures the right kind of questioning for each context without requiring users to understand Socratic methods.

## Trade-off Decisions

| Situation         | Business Priority       | Technical Priority  | Decision Made                     | Rationale                                                             |
| ----------------- | ----------------------- | ------------------- | --------------------------------- | --------------------------------------------------------------------- |
| AI response speed | Fast responses          | Reliable processing | Queue + SSE (slower but reliable) | Users prefer consistent experience over occasional fast/failed        |
| Data flexibility  | Rapid feature iteration | Schema consistency  | MongoDB + Mongoose (flexible)     | Canvas and dialogue schemas evolve rapidly during product development |
| Auth complexity   | Simple login            | Maximum security    | JWT + OAuth + email verification  | Security is non-negotiable for a thinking tool storing personal data  |

## Related Files

- `business-domain.md` — Business needs in detail
- `technical-domain.md` — Technical implementation in detail
- `decisions-log.md` — Decisions made with full context
- `living-notes.md` — Current open questions and issues
