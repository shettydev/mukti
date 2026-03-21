<!-- Context: project-intelligence/business | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Business Domain

> Why Mukti exists, who it serves, and what value it creates.

## Project Identity

```
Project Name: Mukti (मुक्ति, "liberation")
Tagline: A thinking workspace that combats cognitive dependency on AI
Problem Statement: People increasingly rely on AI for direct answers, weakening their ability to think independently
Solution: Socratic assistant that guides through problems with questions, not answers
Philosophy: More questions than answers
```

## Target Users

| User Segment        | Who They Are                           | What They Need                     | Pain Points                           |
| ------------------- | -------------------------------------- | ---------------------------------- | ------------------------------------- |
| Knowledge workers   | Professionals solving complex problems | Structured thinking tools          | Over-reliance on AI for quick answers |
| Students & learners | People developing critical thinking    | Guided problem-solving practice    | Shallow understanding from AI answers |
| Researchers         | People exploring complex topics        | Tools to expose hidden assumptions | Missing foundational knowledge gaps   |

## Value Proposition

**For Users**:

- Build independent thinking skills instead of AI dependency
- Discover hidden assumptions and knowledge gaps through Socratic questioning
- Visual problem-solving through Thinking Canvas (Seed/Soil/Root/Insight nodes)
- Adaptive scaffolding that meets them at their level (never gives direct answers)

**For the Product**:

- Unique positioning: anti-answer AI tool in a market of answer-giving AI
- Community around Socratic techniques
- BYOK model reduces infrastructure costs

## Key Features

| Feature                 | Purpose                                      | Status            |
| ----------------------- | -------------------------------------------- | ----------------- |
| Thinking Canvas         | Visual problem-solving with structured nodes | Implemented       |
| Socratic Conversations  | Text dialogue using 6 techniques             | Implemented       |
| Node Dialogues          | Per-node Socratic chat within canvases       | Implemented       |
| Knowledge Gap Detection | Bayesian Knowledge Tracing for learning gaps | RFC-0001, partial |
| Adaptive Scaffolding    | 5-level scaffold system, auto-fading         | RFC-0002, partial |

## Socratic Techniques

| Technique      | Purpose                                    |
| -------------- | ------------------------------------------ |
| Elenchus       | Cross-examination to expose contradictions |
| Dialectic      | Thesis-antithesis-synthesis dialogue       |
| Maieutics      | "Midwifery" — draw out latent knowledge    |
| Definitional   | Clarify meaning and scope                  |
| Analogical     | Draw parallels to known domains            |
| Counterfactual | Explore "what if" scenarios                |

## Roadmap Context

**Current Focus**: Core product stability — Canvas, Conversations, Node Dialogues
**Next Milestone**: Knowledge Gap Detection (RFC-0001) and Adaptive Scaffolding (RFC-0002)
**Long-term Vision**: A thinking workspace where AI strengthens rather than replaces human cognition

## Business Constraints

- **No direct answers** — The product must never shortcut the thinking process
- **BYOK economics** — Users bring their own API keys, reducing AI infrastructure costs
- **Privacy-first** — Thinking sessions are personal; minimal data collection

## Related Files

- `technical-domain.md` — How this is built technically
- `business-tech-bridge.md` — How business needs map to technical solutions
- `decisions-log.md` — Business decisions with context
