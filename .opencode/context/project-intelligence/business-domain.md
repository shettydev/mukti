<!-- Context: project-intelligence/business | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Business Domain

**Purpose**: Product philosophy, problem statement, and value proposition for Mukti.
**Last Updated**: 2026-03-21

## Quick Reference

- **Purpose**: Understand why Mukti exists and who it serves
- **Update When**: Product pivot, new feature area, user research findings
- **Audience**: Developers, designers, stakeholders

## Project Identity

```
Project Name:      Mukti (मुक्ति, "liberation")
Tagline:           A thinking workspace that combats cognitive dependency on AI
Problem:           AI tools short-circuit independent thought by giving direct answers
Solution:          Socratic assistant that guides users through problems — more questions, no answers
Core Philosophy:   Every feature asks "does this make users think better, or think less?"
```

## Target Users

| User Segment        | Who They Are                                   | What They Need                               | Pain Points                                    |
| ------------------- | ---------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Knowledge Workers   | Professionals solving complex problems with AI | Tools that build capability, not dependency  | AI answers bypass critical thinking entirely   |
| Students / Learners | People learning difficult concepts             | Scaffolded guidance that preserves struggle  | AI homework help undermines deep understanding |
| Researchers/Writers | Creative professionals exploring ideas with AI | Structured reflection to develop originality | AI-generated content feels externally sourced  |

## Value Proposition

**Core Promise**: Mukti is the anti-ChatGPT — it helps you think better, not think less.

**For Users**:

- Socratic dialogue using 6 techniques: elenchus, dialectic, maieutics, definitional, analogical, counterfactual
- Visual Thinking Canvas externalizes problem structure (Seed, Soil, Root, Insight nodes)
- Per-node dialogues with technique auto-selection based on node type
- Adaptive scaffolding that never gives direct answers (5-level system, auto-fades on success)
- Knowledge gap detection prevents Socratic overload on unfamiliar concepts

**For the Product**:

- Differentiated positioning: metacognitive wellness vs. AI productivity tools
- BYOK model reduces platform AI inference costs and scales to power users
- MCP server exposes Socratic tools to external agents (standalone, reusable)

## Active Features

| Feature                     | Status     | RFC      | Description                                                          |
| --------------------------- | ---------- | -------- | -------------------------------------------------------------------- |
| Thinking Canvas             | ✅ Shipped | —        | Visual problem-solving with Seed/Soil/Root/Insight node dialogues    |
| Socratic Conversations      | ✅ Shipped | —        | 6-technique text dialogue system with SSE streaming                  |
| Thought Map                 | ✅ Shipped | RFC-0003 | Extract conversation structure as a visual node map                  |
| Dialogue Quality Guardrails | ✅ Shipped | RFC-0004 | Single-question enforcement, breakthrough + misconception detection  |
| Knowledge Gap Detection     | 🔄 Partial | RFC-0001 | BKT-based foundation failure detection (algorithm done, signals WIP) |
| Adaptive Scaffolding        | 🔄 Partial | RFC-0002 | 5-level scaffold auto-fading (schema done, service wiring WIP)       |
| Session Continuity          | 📋 Planned | RFC-0005 | Temporal awareness and context preservation across sessions          |

## Technique Auto-Selection

Canvas node type drives Socratic technique automatically:

| Node Type | Technique      | Purpose                                  |
| --------- | -------------- | ---------------------------------------- |
| Seed      | Maieutics      | Draw out latent knowledge of the problem |
| Root      | Elenchus       | Challenge assumptions by refutation      |
| Soil      | Counterfactual | Explore constraints by hypothetical      |
| Insight   | Dialectic      | Synthesize competing views               |

## Roadmap Context

**Current Focus**: Complete dialogue quality guardrails (RFC-0004 shipped) → knowledge gap signals (RFC-0001)
**Next Milestone**: Full adaptive scaffolding integration (RFC-0002)
**Long-term Vision**: An AI thinking partner that measurably builds metacognitive capability over time

## 📂 Codebase References

| Reference              | Path                                                | Description                     |
| ---------------------- | --------------------------------------------------- | ------------------------------- |
| Socratic conversations | `packages/mukti-api/src/modules/conversations/`     | 6-technique dialogue engine     |
| Canvas sessions        | `packages/mukti-api/src/modules/canvas/`            | Node CRUD and relationship mgmt |
| Dialogue quality       | `packages/mukti-api/src/modules/dialogue-quality/`  | RFC-0004 guardrails             |
| Knowledge tracing      | `packages/mukti-api/src/modules/knowledge-tracing/` | RFC-0001 BKT algorithm          |
| Adaptive scaffolding   | `packages/mukti-api/src/modules/scaffolding/`       | RFC-0002 5-level system         |
| MCP server             | `packages/mukti-mcp/`                               | Standalone Socratic MCP tools   |
| Active RFCs            | `docs/rfcs/active/`                                 | RFC-0001 through RFC-0005       |

## Related Files

- `technical-domain.md` — How the product is built technically
- `business-tech-bridge.md` — How business needs map to technical solutions
- `decisions-log.md` — Why key product decisions were made
