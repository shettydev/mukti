<!-- Context: product/navigation | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Mukti — Product Context

**Purpose**: Product philosophy, user experience principles, and feature priorities.

---

## Product Philosophy

Mukti combats cognitive dependency on AI. Every product decision follows one principle: **more questions than answers**.

### Core Rules

1. **Never give direct answers** — Always guide through Socratic questioning
2. **Scaffold, don't shortcut** — If a user is stuck, increase scaffold level (RFC-0002), don't bypass
3. **Detect gaps, don't assume** — Use knowledge tracing (RFC-0001) to detect when questioning fails
4. **Visual thinking first** — The Thinking Canvas is the primary surface, not chat

---

## Feature Hierarchy

| Priority | Feature                 | Purpose                                               |
| -------- | ----------------------- | ----------------------------------------------------- |
| Core     | Thinking Canvas         | Visual problem decomposition (Seed/Soil/Root/Insight) |
| Core     | Socratic Conversations  | Text-based guided thinking (6 techniques)             |
| Core     | Node Dialogues          | Per-node contextual questioning within canvas         |
| Next     | Knowledge Gap Detection | Detect when Socratic method fails (RFC-0001)          |
| Next     | Adaptive Scaffolding    | Graduated support without direct answers (RFC-0002)   |
| Future   | Community               | Share and discuss Socratic techniques                 |

---

## UX Principles

- **Japandi aesthetic** — Minimal, calm, warm. Custom CSS theme (`japandi.css`)
- **Progressive disclosure** — Show complexity only when needed
- **Responsive canvas** — Optimistic updates for instant feedback, rollback on error
- **Streaming responses** — SSE-based AI responses that unfold progressively

---

## Socratic Technique Selection

Users don't choose techniques manually. The system auto-selects based on context:

| Context                | Technique             | Why                                                     |
| ---------------------- | --------------------- | ------------------------------------------------------- |
| Seed node (problem)    | Maieutics             | Draw out the user's latent understanding of the problem |
| Root node (assumption) | Elenchus              | Cross-examine the assumption for contradictions         |
| Soil node (constraint) | Counterfactual        | Explore "what if this constraint didn't exist?"         |
| Insight node           | Dialectic             | Thesis-antithesis-synthesis on emerging insights        |
| Text conversation      | User-selected or auto | Flexible for open-ended exploration                     |

---

## Related

- **Business Domain** → `../project-intelligence/business-domain.md`
- **Frontend Patterns** → `../project/mukti-web-patterns.md`
