# Knowledge Gap Solution: Executive Summary

**RFCs**: RFC-0001 (Detection) + RFC-0002 (Scaffolding)  
**Status**: Draft  
**Created**: 2026-02-28  
**Target**: Mukti v1.0.0 / Q2 2026

---

## TL;DR

Solve the **Knowledge Gap Paradox** — where Mukti's Socratic method fails when users genuinely lack foundational knowledge — through a two-part solution:

1. **RFC-0001: Knowledge Gap Detection System** — Detect when users don't know something (vs. being temporarily stuck) using multi-signal analysis and Bayesian Knowledge Tracing.

2. **RFC-0002: Adaptive Scaffolding Framework** — Provide graduated support (5 levels) based on detected gap severity, while preserving Socratic principles.

**Expected Impact**:

- **+64% learning improvement** (vs 30% for on-demand help) based on Wharton study
- **+4-9% mastery rate** based on Tutor CoPilot production data
- **Reduced cognitive debt** from unrestricted AI assistance (per MIT research)

---

## The Problem

**Knowledge Gap Paradox**: Mukti's Socratic method assumes users have latent knowledge that questions can surface. When users genuinely don't know something, continued questioning leads to frustration rather than discovery.

**Symptoms**:

- Users respond with "I don't know" repeatedly
- Consecutive failures without progress
- Help-seeking loops (asking the same thing differently)
- Session abandonment

---

## The Solution

### Part 1: Detection (RFC-0001)

| Signal Type      | Examples                                        | Weight |
| ---------------- | ----------------------------------------------- | ------ |
| **Linguistic**   | "don't know", "no idea", "never learned"        | High   |
| **Behavioral**   | 3+ consecutive failures, help-seeking loops     | High   |
| **Temporal**     | Long pauses, abandonment, rapid submissions     | Medium |
| **Prerequisite** | Missing foundational concepts (recursive check) | High   |

**Output**: Gap Score (0.0–1.0) quantifying knowledge gap severity.

### Part 2: Scaffolding (RFC-0002)

| Level | Name               | Description                                    | Gap Score Trigger |
| ----- | ------------------ | ---------------------------------------------- | ----------------- |
| 0     | Pure Socratic      | Current behavior (probing questions)           | < 0.3             |
| 1     | Meta-Cognitive     | "What strategy are you using?"                 | 0.3–0.5           |
| 2     | Strategic Hints    | Problem decomposition, approach suggestions    | 0.5–0.7           |
| 3     | Worked Examples    | Analogies (not solutions)                      | 0.7–0.85          |
| 4     | Direct Instruction | Brief concept explanation → return to Socratic | > 0.85            |

**Key Feature**: Even Level 4 immediately returns to questioning after brief instruction.

---

## Architecture Overview

```
User Message
     │
     ▼
┌─────────────────────┐
│  KnowledgeGapDetector  │ ← RFC-0001
│  - Linguistic analysis │
│  - Behavior tracking   │
│  - Prerequisite check  │
│  - BKT probability     │
└──────────┬──────────────┘
           │ gapScore, rootGap
           ▼
┌─────────────────────────┐
│  ScaffoldLevelSelector  │ ← RFC-0002
│  - Map score → level    │
│  - Apply fading rules   │
└──────────┬──────────────┘
           │ scaffoldLevel
           ▼
┌─────────────────────────┐
│  ScaffoldPromptAugmenter │ ← RFC-0002
│  - Inject level guidance │
│  - Add rootGap context   │
└──────────┬──────────────┘
           │ augmentedPrompt
           ▼
┌─────────────────────────┐
│  AI Response Generation  │
│  (Existing Mukti flow)   │
└─────────────────────────┘
```

---

## Integration Points

### RFC-0001 Integration

```typescript
// packages/mukti-api/src/modules/dialogue/services/dialogue-queue.service.ts
// BEFORE: AI prompt generation
const gapResult = await this.knowledgeGapDetector.analyze(dialogue, user);
// gapResult = { gapScore: 0.72, rootGap: "recursion", signals: [...] }
```

### RFC-0002 Integration

```typescript
// packages/mukti-api/src/modules/dialogue/utils/prompt-builder.ts
const scaffoldLevel = this.scaffoldLevelSelector.select(gapResult.gapScore, dialogue);
const augmentedPrompt = this.scaffoldPromptAugmenter.augment(
  prompt,
  scaffoldLevel,
  gapResult.rootGap
);
```

---

## Key Decisions

1. **Two separate RFCs** — Detection is foundational; Scaffolding depends on it
2. **5-level system** (not 3-level) — Better granularity per research
3. **Attempt-based primary** (not time-based) — More reliable signal
4. **Fading rule: 2 successes/failures** — Based on ZPD research
5. **Level 4 returns to Socratic** — Preserves Mukti's core philosophy
6. **Prerequisite depth = 3** — Based on 2025 RPKT research

---

## Open Questions (Need Team Input)

1. How to handle open-ended problems with no "correct" answer?
2. Should educators be able to override scaffold levels for accessibility?
3. GDPR: full deletion vs. anonymization of knowledge states?
4. Should Level 4 be disabled for "core competency" problems?
5. How to bootstrap prerequisite graph for new concepts?

---

## Evidence Base

**Production Systems**:

- **Khanmigo** (Khan Academy): 40K → 1M+ students with adaptive scaffolding
- **Tutor CoPilot**: +4% mastery overall, +9% for struggling students

**Research**:

- **Wharton 2026**: Controlled scaffolding → 64% improvement (vs 30% on-demand)
- **SEELE Framework**: Adaptive hint length improves learning outcomes
- **MIT Brain on ChatGPT**: Unrestricted AI assistance → cognitive debt accumulation
- **RPKT 2025**: Recursive prerequisite tracing for root cause detection

**Open-Source Implementations**:

- [parcadei/Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3) — 5-level hint system
- [mhmd-249/socratic-tutor](https://github.com/mhmd-249/socratic-tutor) — Socratic prompting patterns

---

## Next Steps for Reviewers

1. **Read full RFCs**:
   - [RFC-0001: Knowledge Gap Detection](./RFC-0001-knowledge-gap-detection.md)
   - [RFC-0002: Adaptive Scaffolding Framework](./RFC-0002-adaptive-scaffolding-framework.md)
2. **Answer open questions** (Section 13 of each RFC)
3. **Validate API contracts** — Do these meet frontend needs?
4. **Review performance targets** — Are thresholds realistic?
5. **Assess security mitigations** — Any gaps?

---

## Alignment with Mukti Philosophy

> **Mukti = Liberation from AI Dependency**

This solution directly supports Mukti's core mission:

- ✅ **Progressive scaffolding prevents direct answers** (Socratic integrity maintained)
- ✅ **Fading mechanism encourages independence** (not dependency)
- ✅ **Gap detection distinguishes ignorance from struggle** (appropriate response)
- ✅ **Even Level 4 returns to questioning** (never abandons Socratic method)
- ✅ **Designed friction is intentional** (builds cognitive muscle)

**Warning**: This system will feel "restrictive" to users accustomed to unrestricted AI assistance. This is by design. User education will be critical during rollout.

---

**Full RFCs**: ~1900 lines total | Implementation-ready specifications  
**Research Base**: 10+ production systems and academic studies  
**Target Audience**: Engineering team, product owners, educators
