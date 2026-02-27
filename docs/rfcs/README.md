# Mukti RFCs (Request for Comments)

This directory contains technical design documents (RFCs) for major features and architectural decisions in the Mukti project.

## RFC Index

### Active RFCs

| RFC #                                                    | Title                          | Status | Author     | Date       | Target           |
| -------------------------------------------------------- | ------------------------------ | ------ | ---------- | ---------- | ---------------- |
| [RFC-0001](./RFC-0001-knowledge-gap-detection.md)        | Knowledge Gap Detection System | Draft  | Mukti Team | 2026-02-28 | v1.0.0 / Q2 2026 |
| [RFC-0002](./RFC-0002-adaptive-scaffolding-framework.md) | Adaptive Scaffolding Framework | Draft  | Mukti Team | 2026-02-28 | v1.0.0 / Q2 2026 |

### Quick Links

- **[RFC-0001: Knowledge Gap Detection](./RFC-0001-knowledge-gap-detection.md)** — Foundational system for detecting when users lack prerequisite knowledge
- **[RFC-0002: Adaptive Scaffolding Framework](./RFC-0002-adaptive-scaffolding-framework.md)** — 5-level progressive scaffolding system (depends on RFC-0001)
- **[Executive Summary](./KNOWLEDGE-GAP-SUMMARY.md)** — TL;DR for stakeholders
- **[Implementation Checklist](./KNOWLEDGE-GAP-IMPLEMENTATION-CHECKLIST.md)** — 12-week development plan

---

## RFC-0001: Knowledge Gap Detection System

**Status**: Draft → Awaiting Review  
**Target**: Mukti v1.0.0 / Q2 2026  
**Estimated Effort**: 4 weeks

### What It Does

Detects when users genuinely lack foundational knowledge (vs. being temporarily stuck) using multi-signal analysis. This is the **foundational system** that RFC-0002 builds upon.

### Key Features

- **Multi-Signal Detection**: Linguistic markers ("don't know", "no idea"), behavioral patterns (consecutive failures, help-seeking loops), temporal signals (abandonment)
- **Bayesian Knowledge Tracing (BKT)**: Probabilistic knowledge state estimation per-user, per-concept
- **Recursive Prerequisite Checking**: Traces knowledge gaps to root causes (depth=3)
- **Gap Score Calculation**: 0.0-1.0 score quantifying knowledge gap severity

### Core Problem Solved

The **Knowledge Gap Paradox**: Mukti's Socratic method assumes users have latent knowledge that questions can surface. When users genuinely don't know something, continued questioning leads to frustration rather than discovery.

### Integration Point

```typescript
// packages/mukti-api/src/modules/dialogue/services/dialogue-queue.service.ts
// BEFORE: AI prompt generation
// INSERT: KnowledgeGapDetector.analyze(dialogue, user)
```

---

## RFC-0002: Adaptive Scaffolding Framework

**Status**: Draft → Awaiting Review  
**Target**: Mukti v1.0.0 / Q2 2026  
**Estimated Effort**: 8 weeks  
**Depends On**: RFC-0001

### What It Does

Implements a **5-level progressive scaffolding system** that adjusts support based on detected knowledge gaps while preserving Socratic principles.

### Scaffold Levels

| Level | Name               | Description                                    | Gap Score |
| ----- | ------------------ | ---------------------------------------------- | --------- |
| 0     | Pure Socratic      | Current behavior (probing questions)           | < 0.3     |
| 1     | Meta-Cognitive     | "What strategy are you using?"                 | 0.3–0.5   |
| 2     | Strategic Hints    | Problem decomposition, approach suggestions    | 0.5–0.7   |
| 3     | Worked Examples    | Analogies (not solutions)                      | 0.7–0.85  |
| 4     | Direct Instruction | Brief concept explanation → return to Socratic | > 0.85    |

### Key Features

- **Automatic Fading**: Up one level after 2 consecutive failures, down after 2 successes
- **Socratic Preservation**: Even Level 4 immediately returns to questioning
- **Prompt Augmentation**: `ScaffoldPromptAugmenter` injects level-appropriate guidance

### Expected Impact

- **+64% learning improvement** (vs 30% for on-demand help) — Wharton Study 2026
- **+4-9% mastery rate** — Tutor CoPilot production data
- **Reduced cognitive debt** — Per MIT research on AI assistance

### Integration Point

```typescript
// packages/mukti-api/src/modules/dialogue/utils/prompt-builder.ts
// AFTER: KnowledgeGapDetector result received
// INSERT: ScaffoldPromptAugmenter.augment(prompt, scaffoldLevel, rootGap)
```

---

## Evidence Base

### Research Foundation

| Source                       | Key Findings                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| **ZPD & Scaffolding Theory** | 5-level scaffolding hierarchy, fading rules (2 successes/failures), expertise reversal effect |
| **Educational AI Systems**   | Khan Academy mastery, Carnegie Learning BKT, ALEKS knowledge spaces                           |
| **AI Tutoring Research**     | Khanmigo prompts, minimal assistance principle (64% vs 30% improvement)                       |
| **MIT "Brain on ChatGPT"**   | Cognitive debt from over-assistance; justifies graduated scaffolding                          |

### Production Systems Analyzed

- **Khanmigo** (Khan Academy): 1M+ students, Socratic-first with struggle detection
- **Tutor CoPilot**: +4-9% mastery rate with adaptive hints
- **Carnegie Learning**: BKT for knowledge state tracking

---

## RFC Process

### 1. Proposal

- Create RFC document using [RFC template](../templates/RFC-TEMPLATE.md)
- Follow numbering convention: `RFC-NNNN-title.md`
- Include all required sections (Abstract, Motivation, Design, etc.)

### 2. Review

- Post RFC in `#rfcs` Slack channel
- Tag relevant stakeholders for review
- Address feedback and update RFC
- Mark status: Draft → In Review

### 3. Approval

- Collect sign-offs from required reviewers (Engineering, Product, Security, etc.)
- Update Decision Log (Section 14) with approvals
- Mark status: In Review → Accepted

### 4. Implementation

- Create tracking issue (GitHub/Linear/Jira)
- Link RFC in issue description
- Use implementation checklist to track progress
- Update RFC with any design changes during implementation

### 5. Completion

- Document learnings in post-launch retrospective
- Update README with "Implemented in vX.Y.Z"
- Archive RFC (move to `archive/` if needed)

---

## RFC Status Definitions

| Status          | Definition                                  |
| --------------- | ------------------------------------------- |
| **Draft**       | Initial proposal; actively seeking feedback |
| **In Review**   | Under formal review by stakeholders         |
| **Accepted**    | Approved for implementation                 |
| **Rejected**    | Not moving forward; see rationale in RFC    |
| **Superseded**  | Replaced by a newer RFC (link provided)     |
| **Implemented** | Shipped to production; archived             |

---

## Archive

Historical RFCs and superseded documents are stored in [`archive/`](./archive/).

---

## Templates

- **[RFC Template](../templates/RFC-TEMPLATE.md)** — Use this to create new RFCs

---

## Questions?

- **Slack**: Post in `#rfcs` channel
- **Email**: engineering@mukti.dev
- **GitHub**: Open discussion in [mukti/discussions](https://github.com/mukti/mukti/discussions)
