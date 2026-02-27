# RFC-0001 Summary: Adaptive Scaffolding Framework

**Status**: Draft  
**Created**: 2026-02-28  
**Target**: Mukti v1.0.0 / Q2 2026

---

## TL;DR

Implement a **5-level progressive hint system** with **struggle detection** and **learning profile tracking** to provide adaptive scaffolding that balances Socratic inquiry with minimal assistance. System uses attempt-based thresholds (1, 3, 5+ attempts), credit costs (0-25 per hint), and profile-aware adaptation to prevent both under-scaffolding (frustration) and over-scaffolding (cognitive debt).

**Expected Impact**:

- **+64% learning improvement** (vs 30% for on-demand help) based on Wharton study
- **+4-9% mastery rate** based on Tutor CoPilot production data
- **Reduced cognitive debt** from unrestricted AI assistance (per MIT research)

---

## Core Components

### 1. Multi-Level Hint System (5 Levels)

| Level | Type          | Cost | Example                                           |
| ----- | ------------- | ---- | ------------------------------------------------- |
| 1     | Conceptual    | 0    | "What divide-and-conquer strategy could you use?" |
| 2     | Strategic     | 5    | "Consider partitioning around a pivot."           |
| 3     | Tactical      | 10   | "1. Choose pivot. 2. Partition. 3. Recurse."      |
| 4     | Computational | 15   | Pseudo-code with TODOs                            |
| 5     | Answer        | 25   | Full solution with explanation                    |

**Source**: Inspired by [parcadei/Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3)

### 2. Struggle Detection

**Primary Signal**: Attempt count

- 1-2 attempts: No escalation (productive struggle)
- 3-4 attempts: Escalate to Strategic hints (level 2)
- 5+ attempts: Escalate to Tactical hints (level 3)

**Secondary Signals**:

- Time-on-task (2min, 5min, 10min thresholds)
- Sentiment analysis (keywords: "give up", "stuck", "don't understand")

**Source**: Based on [Tutor CoPilot research](https://edworkingpapers.com/sites/default/files/ai24_1054_v2.pdf)

### 3. Learning Profile Tracking

**Schema**:

```typescript
{
  identified_gaps: [{ concept: "recursion", severity: "high" }],
  strengths: ["loops", "conditionals"],
  mastery_map: { "loops": 0.85, "recursion": 0.30 },
  hint_usage_stats: { total: 42, by_level: {...} },
  performance_metrics: { success_rate: 0.72, independence: 0.58 }
}
```

**Adaptation Logic**:

- Users with **identified gaps** in current concept → escalate hints faster
- Users with **strengths** in current concept → de-escalate hints (encourage independence)

### 4. Credit/Cost System

**Initial Credits**: 200/week (refreshes Monday 00:00 UTC)

**Earning Credits**:

- Solve without hints: +10
- Solve with only level 1-2 hints: +5
- Daily challenge: +20
- Weekly independence >70%: +15

**Constraints**:

- Max 3 hints per problem (minimal assistance principle)
- 30-second cooldown between hints (prevent gaming)
- Low balance warning at 20% of weekly allowance

---

## API Summary

### `POST /api/v1/scaffolding/hint`

Request a hint based on struggle detection

**Request**: `{ user_id, problem_id, attempt_count, time_on_task, ... }`  
**Response**: `{ hint, level, cost, remaining_credits, struggle_level }`

### `GET /api/v1/scaffolding/profile`

Retrieve user's learning profile (gaps, strengths, mastery, stats)

### `GET /api/v1/scaffolding/credits`

Retrieve credit account details (balance, transactions, next refresh)

---

## Database Changes (Additive Only)

**New Tables**:

1. `learning_profile` — User gaps, strengths, mastery map
2. `credit_account` — Credit balance and weekly allowance
3. `credit_transaction` — Earn/spend transaction history
4. `struggle_record` — Struggle events with hints used
5. `hint_usage_record` — Full audit trail of hints delivered

**Migration**: < 5 seconds (no data migration, just schema creation)

---

## Rollout Plan

| Phase | Description               | Entry Criteria            | Exit Criteria                               |
| ----- | ------------------------- | ------------------------- | ------------------------------------------- |
| 1     | Internal dogfood          | Tests pass                | No P0 bugs for 1 week                       |
| 2     | 10% canary                | Phase 1 complete          | p95 latency < 3s, no credit bugs for 3 days |
| 3     | 50% rollout               | Metrics within thresholds | >80% user satisfaction                      |
| 4     | 100% general availability | Phase 3 complete          | Full production                             |

**Feature Flags**:

- `adaptive_scaffolding_enabled` (master switch)
- `adaptive_scaffolding.struggle_detection`
- `adaptive_scaffolding.credit_system`
- `adaptive_scaffolding.gap_detection`
- `adaptive_scaffolding.emergency_disable` (kill switch)

---

## Key Decisions

1. **5-level system** (not 3-level) — Better granularity per research
2. **Attempt-based primary** (not time-based) — More reliable signal
3. **Weekly credits** (not daily) — Encourages planning and reflection
4. **Max 3 hints/problem** — Enforces minimal assistance principle
5. **30s cooldown** — Prevents rapid-fire hint requests

---

## Open Questions (Need Team Input)

1. Should users be able to "bank" credits beyond weekly allowance?
2. How to handle open-ended problems with no "correct" answer?
3. Should educators be able to override credit limits for accessibility?
4. GDPR: full deletion vs. anonymization of learning profiles?
5. Should level 5 (full answer) be disabled for "core competency" problems?

---

## Evidence Base

**Production Systems**:

- **Khanmigo** (Khan Academy): 40K → 1M+ students with adaptive scaffolding
- **Tutor CoPilot**: +4% mastery overall, +9% for struggling students

**Research**:

- **Wharton 2026**: Controlled scaffolding → 64% improvement (vs 30% on-demand)
- **SEELE Framework**: Adaptive hint length improves learning outcomes
- **MIT Brain on ChatGPT**: Unrestricted AI assistance → cognitive debt accumulation

**Open-Source Implementations**:

- [parcadei/Continuous-Claude-v3](https://github.com/parcadei/Continuous-Claude-v3) — 5-level hint system with costs
- [mhmd-249/socratic-tutor](https://github.com/mhmd-249/socratic-tutor) — Production Socratic prompting patterns

---

## Next Steps for Reviewers

1. **Read full RFC**: [RFC-0001-Adaptive-Scaffolding-Framework.md](./RFC-0001-Adaptive-Scaffolding-Framework.md)
2. **Answer open questions** (Section 13 of RFC)
3. **Validate API contracts** (Section 6) — do these meet frontend needs?
4. **Review performance targets** (Section 10) — are thresholds realistic?
5. **Assess security mitigations** (Section 9) — any gaps?

---

## Alignment with Mukti Philosophy

> **Mukti = Liberation from AI Dependency**

This RFC directly supports Mukti's core mission:

- ✅ **Progressive hints prevent direct answers** (Socratic integrity maintained)
- ✅ **Credit limits prevent over-reliance** (encourages independence)
- ✅ **Struggle detection balances support vs. autonomy** (ZPD optimization)
- ✅ **Learning profiles track genuine mastery** (not just task completion)
- ✅ **Designed friction (cooldowns, max hints)** is intentional (builds cognitive muscle)

**Warning**: This system will feel "restrictive" to users accustomed to unrestricted AI assistance. This is by design. User education will be critical during rollout.

---

**Full RFC**: 1034 lines | 41KB | Implementation-ready specifications  
**Research Base**: 10+ production systems and academic studies  
**Code Examples**: 4 open-source repositories analyzed  
**Target Audience**: Engineering team, product owners, educators
