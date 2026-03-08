# RFC-0001: Knowledge Gap Detection System

<!-- HEADER BLOCK: Identifies the RFC and its current lifecycle state at a glance. -->

| Field            | Value                                                                         |
| ---------------- | ----------------------------------------------------------------------------- |
| **RFC Number**   | 0001                                                                          |
| **Title**        | Knowledge Gap Detection System                                                |
| **Status**       | ![Status: Accepted](https://img.shields.io/badge/Status-Accepted-brightgreen) |
| **Author(s)**    | [Prathik Shetty](https://github.com/shettydev)                                |
| **Created**      | 2026-02-28                                                                    |
| **Last Updated** | 2026-03-04                                                                    |

> **Status options:** `Draft` | `In Review` | `Accepted` | `Implemented` | `Rejected` | `Superseded`

---

## 1. Abstract

This RFC proposes a Knowledge Gap Detection System for Mukti that identifies when users genuinely lack foundational knowledge required to engage productively with Socratic questioning. The system introduces multi-signal detection (behavioral, linguistic, temporal), probabilistic knowledge state tracking using Bayesian Knowledge Tracing (BKT), and recursive prerequisite checking to find root knowledge gaps. When detected, the system triggers appropriate scaffolding interventions (see RFC-0002) rather than continuing pure Socratic dialogue that assumes latent knowledge exists. This addresses the "Knowledge Gap Paradox" — Mukti's current assumption that all users have dormant knowledge waiting to be surfaced through questioning.

---

## 2. Motivation

Mukti's Socratic approach assumes users have latent knowledge that can be surfaced through careful questioning. This assumption fails catastrophically when users genuinely don't know something — they cannot reason toward answers they have no foundation for.

### Current Pain Points

- **Pain Point 1: Frustration Loops** — Users caught in endless questioning cycles when they lack prerequisite knowledge. Current system has no fallback, leading to "I already told you I don't know" frustration.

- **Pain Point 2: No Knowledge State Modeling** — Mukti treats every interaction as stateless. It cannot distinguish between "hasn't thought about it yet" (productive questioning target) and "genuinely doesn't know the concept" (needs teaching first).

- **Pain Point 3: Prerequisite Blindness** — When a user struggles with concept X, the real gap may be prerequisite concepts P1, P2, P3. Current system keeps questioning about X instead of tracing back to the root gap.

- **Pain Point 4: Silent Abandonment** — Users who hit knowledge gaps often disengage silently. There's no detection of "outside ZPD" (Zone of Proximal Development) signals to trigger intervention.

### Evidence from Research

Production educational AI systems (Khan Academy, ALEKS, Carnegie Learning) all implement explicit knowledge gap detection:

- **Carnegie Learning's BKT**: Tracks P(knowledge) per-skill, intervenes when P < 0.3
- **ALEKS Knowledge Spaces**: Maps prerequisite relationships, only presents "ready to learn" concepts
- **AutoTutor**: Uses NLU to detect missing concepts in student explanations
- **2025 RPKT Research**: Shows recursive prerequisite checking is essential for "unknown unknowns"

Mukti's MCP server already has partial detection (`stuckIndicators` in `response-strategies.ts`) but it's disconnected from the main dialogue service.

---

## 3. Goals & Non-Goals

### Goals

- [x] Detect knowledge gaps through multi-signal analysis (behavioral, linguistic, temporal)
- [x] Implement lightweight Bayesian Knowledge Tracing for probabilistic knowledge state
- [x] Build recursive prerequisite checking to find root gaps (up to 3 levels deep)
- [x] Integrate detection into queue processing before AI prompt generation
- [x] Track knowledge state per-user, per-concept across sessions
- [x] Provide clear intervention triggers for scaffolding system (RFC-0002)

### Non-Goals

- **Full curriculum mapping**: We won't build complete prerequisite graphs for all domains. Start with common programming concepts, expand iteratively.
- **Replacement of Socratic method**: Detection triggers scaffolding, not abandonment of questioning entirely.
- **Real-time forgetting curves**: Spaced repetition is valuable but out of scope for v1. Focus on immediate gap detection.
- **Automated prerequisite inference**: Manual + LLM-assisted prerequisite mapping is acceptable; fully automated curriculum generation is future work.

---

## 4. Background & Context

### Prior Art

| Reference                                           | Relevance                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `mukti-mcp-server/src/response-strategies.ts`       | Existing `stuckIndicators` detection (disconnected from API)               |
| `docs/reference/planning/unified-thinking-model.md` | Documents "Anti-Resolution Signals" and frustration patterns               |
| GitHub Issue #3                                     | "Implement dynamic resource suggestion engine" — related but unimplemented |
| Carnegie Learning BKT                               | Production-validated probabilistic knowledge tracking                      |
| ALEKS Knowledge Space Theory                        | Prerequisite graph + "outer fringe" concept                                |
| RPKT (2025)                                         | Recursive prerequisite knowledge tracing for "unknown unknowns"            |

### System Context Diagram

```mermaid
graph TB
    subgraph "Current Mukti Flow"
        A[User Message] --> B[DialogueQueueService]
        B --> C[PromptBuilder]
        C --> D[AI Service]
        D --> E[Socratic Response]
    end

    subgraph "Proposed Addition"
        B --> F[Knowledge Gap Detector]
        F -->|gap_detected| G[Scaffolding Trigger]
        F -->|no_gap| C
        G --> H[Modified Prompt with Scaffold Level]
        H --> D
    end

    style F fill:#f9f,stroke:#333
    style G fill:#f9f,stroke:#333
```

---

## 5. Proposed Solution

### Overview

The Knowledge Gap Detection System operates as a pre-processing layer before AI prompt generation. It analyzes multiple signals to determine if the user is "outside their ZPD" — unable to productively engage with pure Socratic questioning due to missing foundational knowledge.

The system maintains a probabilistic knowledge state per-user, per-concept using simplified Bayesian Knowledge Tracing. It computes a weighted gap score from linguistic, behavioral, temporal, and knowledge-state signals, then maps that score to scaffold levels via `GAP_SCORE_THRESHOLDS` (`0.3`, `0.5`, `0.7`, `0.85`).

### Architecture Diagram

```mermaid
graph LR
    subgraph "Knowledge Gap Detection System"
        A[User Response] --> B[Signal Analyzer]
        B --> C{Multi-Signal Fusion}

        C --> D[Linguistic Signals]
        C --> E[Behavioral Signals]
        C --> F[Temporal Signals]
        C --> G[Knowledge State]

        D --> H[Gap Score Calculator]
        E --> H
        F --> H
        G --> H

        H --> I{Gap Score Thresholds}
        I -->|score < 0.3| L[Continue Socratic]
        I -->|0.3-0.85| K[Scaffolding Levels 1-3]
        I -->|score >= 0.85| J[Direct Instruction]

        J --> M[Prerequisite Checker]
        M --> N[Root Gap Identification]
    end
```

### Sequence Flow

```mermaid
sequenceDiagram
    participant User
    participant Queue as DialogueQueueService
    participant Detector as KnowledgeGapDetector
    participant BKT as KnowledgeStateTracker
    participant Prereq as PrerequisiteChecker
    participant Prompt as PromptBuilder
    participant AI as AIService

    User->>Queue: Submit response
    Queue->>Detector: Analyze response

    Detector->>Detector: Extract linguistic signals
    Detector->>Detector: Check behavioral patterns
    Detector->>BKT: Get current P(knowledge)
    BKT-->>Detector: P = 0.25

    alt gapScore >= 0.3 (Knowledge Gap)
        Detector->>Prereq: Check prerequisites
        Prereq->>Prereq: Recursive check (depth=3)
        Prereq-->>Detector: Root gap: "loops fundamentals"
        Detector-->>Queue: GapDetectionResult(level=3, rootGap)
        Queue->>Prompt: Build scaffold prompt (level 3)
    else gapScore < 0.3 (Productive Zone)
        Detector-->>Queue: GapDetectionResult(level=0)
        Queue->>Prompt: Build Socratic prompt
    end

    Prompt->>AI: Generate response
    AI-->>User: Scaffolded or Socratic response

    User->>Queue: Next response
    Queue->>BKT: Update knowledge state
```

### Detailed Design

#### 5.1 Signal Analyzer

The Signal Analyzer extracts four categories of signals from user responses and feeds them into the Gap Score Calculator:

```mermaid
graph TB
    A[User Response] --> B[Signal Analyzer]

    B --> C[Linguistic Signals]
    B --> D[Behavioral Signals]
    B --> E[Temporal Signals]
    B --> F[Knowledge State]

    C --> G[Gap Score Calculator]
    D --> G
    E --> G
    F --> G

    G --> H[GapDetectionResult]
```

**Linguistic Signals** — Pattern-matched phrases from user text (derived from MCP server `stuckIndicators`):

| Category      | Example Markers                                                                       | Indicates                       |
| ------------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| Knowledge Gap | "don't know", "no idea", "never heard of", "what is", "no clue", "unfamiliar"         | Missing foundational concept    |
| Confusion     | "don't understand", "unclear", "confusing", "lost", "makes no sense", "over my head"  | Concept present but unclear     |
| Frustration   | "frustrated", "stuck", "giving up", "already told you", "just tell me", "stop asking" | Outside ZPD, needs intervention |

**Behavioral Signals**:

| Signal              | Threshold                       | Indicates                               |
| ------------------- | ------------------------------- | --------------------------------------- |
| consecutiveFailures | > 3 attempts on same concept    | Persistent gap, not temporary confusion |
| helpSeekingLoop     | Same question asked > 2 times   | User cannot progress independently      |
| responseDegrade     | Response length shrinking       | Engagement drop, disengagement risk     |
| randomGuessing      | Non-systematic approach changes | No mental model to guide reasoning      |

**Temporal Signals**:

| Signal             | Threshold                             | Indicates                      |
| ------------------ | ------------------------------------- | ------------------------------ |
| timeOnProblem      | > 15 minutes without progress         | Extended unproductive struggle |
| responseLag        | Long pause → short/incorrect response | Cognitive overload             |
| abandonmentPattern | Started response, deleted, gave up    | Silent disengagement           |

**Knowledge State** (from BKT):

- Current P(knowledge) for detected concept
- Prerequisite mastery levels
- Historical performance on related concepts

#### 5.2 Bayesian Knowledge Tracing (BKT)

Simplified BKT with 4 parameters per concept. Each concept tracks a probability P(L) that the user has learned it, updated after every interaction using Bayes' theorem.

**BKT Parameters** (per concept, with defaults):

| Parameter | Symbol | Default | Meaning                                    |
| --------- | ------ | ------- | ------------------------------------------ |
| pInit     | P(L₀)  | 0.3     | Initial knowledge probability              |
| pLearn    | P(T)   | 0.15    | Learning rate per interaction              |
| pSlip     | P(S)   | 0.1     | Probability of error despite knowing       |
| pGuess    | P(G)   | 0.25    | Probability of correct despite not knowing |

**Key Thresholds**: Mastery = `0.95`, Struggling = `0.4`

**Update Algorithm**:

```mermaid
flowchart TD
    A[User Interaction] --> B{Response Correct?}

    B -->|Yes| C["P(L|correct) = P(L)·(1-pSlip) / [P(L)·(1-pSlip) + (1-P(L))·pGuess]"]
    B -->|No| D["P(L|incorrect) = P(L)·pSlip / [P(L)·pSlip + (1-P(L))·(1-pGuess)]"]

    C --> E["Apply learning transition:<br/>P(L') = P(L|evidence) + (1 - P(L|evidence)) · pLearn"]
    D --> E

    E --> F{P(L') ≥ 0.95?}
    F -->|Yes| G[Mastered — reduce scaffold]
    F -->|No| H{P(L') ≤ 0.4?}
    H -->|Yes| I[Struggling — increase scaffold]
    H -->|No| J[In progress — maintain level]
```

The update uses standard Bayesian posterior calculation: given the observed evidence (correct/incorrect), compute the posterior probability of knowledge, then apply a learning transition that accounts for the possibility of learning during the interaction itself.

#### 5.3 Prerequisite Checker

Recursive prerequisite checking to find root knowledge gaps. The checker traverses the concept prerequisite graph (a DAG) up to 3 levels deep, looking for the deepest unmastered prerequisite — the "root gap."

```mermaid
flowchart TD
    A["Start: Check concept C<br/>(depth=0, maxDepth=3)"] --> B{depth ≥ maxDepth?}

    B -->|Yes| C["Return C as root gap<br/>(max depth reached)"]
    B -->|No| D["Get prerequisites of C<br/>from concept graph"]

    D --> E{Any prerequisites?}
    E -->|No| F["Return: no gap found"]
    E -->|Yes| G["For each prerequisite P"]

    G --> H{"P(L) for P < 0.5?<br/>(not mastered)"}
    H -->|No| I["P is mastered — skip"]
    H -->|Yes| J["Add P to missing list"]

    J --> K["Recurse: check P's prerequisites<br/>(depth + 1)"]
    K --> L["Track deepest gap found"]

    I --> M{More prerequisites?}
    L --> M
    M -->|Yes| G
    M -->|No| N{Deeper gap found?}

    N -->|Yes| O["Return deepest gap as root gap<br/>+ all missing prerequisites"]
    N -->|No| P["Return first missing prereq as root gap"]
```

**Key behaviors:**

- **Depth cap at 3**: Diminishing returns beyond 3 levels; prevents performance degradation on deep graphs
- **Unknown concepts default to P(L) = 0.3**: If a concept has never been assessed, assume low probability (conservative)
- **Deepest-first**: The algorithm returns the deepest unmastered prerequisite as the root gap, ensuring scaffolding addresses the most foundational missing knowledge
- **Caching**: Frequently-accessed concept subgraphs are cached to keep recursive checks under 20ms

#### 5.4 Gap Score Calculator

Multi-signal fusion produces a final gap score (0–1) using a weighted combination:

**Signal Weights:**

| Signal               | Weight | Rationale                                           |
| -------------------- | ------ | --------------------------------------------------- |
| Linguistic           | 0.30   | Direct user expression of confusion/ignorance       |
| Behavioral           | 0.25   | Objective patterns (failures, loops, degradation)   |
| Temporal             | 0.15   | Time-based signals (less reliable, supplementary)   |
| Knowledge (1 - P(L)) | 0.30   | BKT probability inverted (low knowledge = high gap) |

**Formula:** `gapScore = 0.3·linguistic + 0.25·behavioral + 0.15·temporal + 0.3·(1 - P(L))`

**Gap Score → Scaffold Level Mapping:**

```mermaid
flowchart LR
    A["Gap Score<br/>0.0 — 1.0"] --> B{"< 0.3"}
    B -->|Yes| C["Level 0<br/>Pure Socratic"]
    B -->|No| D{"< 0.5"}
    D -->|Yes| E["Level 1<br/>Meta-Cognitive"]
    D -->|No| F{"< 0.7"}
    F -->|Yes| G["Level 2<br/>Strategic Hints"]
    F -->|No| H{"< 0.85"}
    H -->|Yes| I["Level 3<br/>Worked Examples"]
    H -->|No| J["Level 4<br/>Direct Instruction"]
```

**GapDetectionResult** contains: gap score, current P(L), scaffold level (0–4), root gap (from prerequisite checker), per-signal scores, and a recommendation (`socratic` | `scaffold` | `teach`).

#### 5.5 Integration with DialogueQueueService

The `DialogueQueueService` orchestrates gap detection as a pre-processing step before AI prompt generation. The integration follows a 5-step pipeline:

```mermaid
sequenceDiagram
    participant DQS as DialogueQueueService
    participant GD as KnowledgeGapDetector
    participant SF as ScaffoldFadeService
    participant AI as DialogueAIService
    participant BKT as KnowledgeStateTracker

    Note over DQS: Step 1: Detect gaps before generation
    DQS->>GD: analyze(message, history, concepts, timing)
    GD-->>DQS: GapDetectionResult(scaffoldLevel, rootGap)

    Note over DQS: Step 2: Resolve effective level
    DQS->>DQS: effectiveLevel = max(detected, stored)

    Note over DQS: Step 3: Build scaffold context
    DQS->>DQS: ScaffoldContext(level, rootGap, concepts, counters)

    Note over DQS: Step 4: Generate scaffold-aware response
    DQS->>AI: generateScaffoldedResponse(context, scaffoldContext)
    AI-->>DQS: AI response

    Note over DQS: Step 5: Post-response evaluation
    DQS->>SF: evaluateAndTransition(response quality)
    DQS->>BKT: updateKnowledgeState(userId, conceptId, isCorrect)
```

**Key design decision:** The effective scaffold level is computed as `max(detectedLevel, storedLevel)`. This means detection can **escalate immediately** but de-escalation is controlled only by the fade rules in RFC-0002. This prevents abrupt level drops mid-conversation.

---

## 6. API / Interface Design

### Internal Service Interfaces

```mermaid
classDiagram
    class KnowledgeGapDetector {
        +analyze(input: GapDetectionInput) GapDetectionResult
        +updateKnowledgeState(userId, conceptId, isCorrect) void
    }

    class GapDetectionInput {
        +string userMessage
        +ConversationTurn[] conversationHistory
        +string userId
        +string[] conceptContext?
        +number[] previousResponseLengths?
        +number timeOnProblem?
        +string aiApiKey?
        +string aiModel?
    }

    class GapDetectionResult {
        +number gapScore
        +number knowledgeProbability
        +ScaffoldLevel scaffoldLevel
        +string rootGap?
        +SignalScores signals
        +string recommendation
    }

    KnowledgeGapDetector ..> GapDetectionInput : accepts
    KnowledgeGapDetector ..> GapDetectionResult : returns
```

### REST Endpoints (Admin/Debug)

Implemented base route: `knowledge-tracing`

- `POST /knowledge-tracing/update`
- `GET /knowledge-tracing/state/:userId/:conceptId`
- `GET /knowledge-tracing/user/:userId`
- `DELETE /knowledge-tracing/state/:userId/:conceptId/reset`
- `GET /knowledge-tracing/concept/:conceptId/struggling`
- `GET /knowledge-tracing/concept/:conceptId/mastered`
- `GET /knowledge-tracing/admin/cache-stats`
- `POST /knowledge-tracing/concepts`
- `GET /knowledge-tracing/concepts`
- `GET /knowledge-tracing/concepts/:conceptId`
- `PATCH /knowledge-tracing/concepts/:conceptId`
- `DELETE /knowledge-tracing/concepts/:conceptId`

---

## 7. Data Model Changes

### Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ KNOWLEDGE_STATE : "has knowledge of"
    CONCEPT ||--o{ KNOWLEDGE_STATE : "tracked by"
    CONCEPT ||--o{ CONCEPT : "has prerequisites"
    NODE_DIALOGUE ||--o| KNOWLEDGE_STATE : "updates"

    KNOWLEDGE_STATE {
        ObjectId _id PK
        ObjectId userId FK
        string conceptId FK
        number attempts
        number correctAttempts
        number currentProbability
        Date lastAssessed
        object bktParameters
    }

    CONCEPT {
        ObjectId _id PK
        string conceptId UK
        string name
        string domain
        string difficulty
        string[] prerequisites
        string[] keywords
        object bktParameters
        boolean autoDiscovered
        boolean verified
        boolean isActive
    }

    NODE_DIALOGUE {
        number currentScaffoldLevel
        number consecutiveSuccesses
        number consecutiveFailures
        string[] detectedConcepts
        object lastGapDetection
        array scaffoldHistory
    }
```

### New Collection: `knowledge_states`

Tracks per-user, per-concept BKT probability. Indexed on `(userId, conceptId)` with a unique compound index.

| Field              | Type   | Description                                                   |
| ------------------ | ------ | ------------------------------------------------------------- |
| bktParameters      | object | Embedded `{ pInit, pLearn, pSlip, pGuess }` — per-concept BKT |
| currentProbability | number | Current P(L) from BKT updates                                 |
| attempts           | number | Total interaction count                                       |
| correctAttempts    | number | Successful interaction count                                  |

### New Collection: `concepts`

Stores the prerequisite graph. Each concept has a `prerequisites[]` array forming a DAG.

| Field          | Type     | Description                                                    |
| -------------- | -------- | -------------------------------------------------------------- |
| difficulty     | string   | Enum: `beginner`, `intermediate`, `advanced`                   |
| prerequisites  | string[] | Array of conceptIds forming the prerequisite DAG               |
| bktParameters  | object   | Default BKT parameters for this concept (overridable)          |
| autoDiscovered | boolean  | Whether this concept was auto-discovered by LLM extraction     |
| verified       | boolean  | Whether a human has verified this concept's prerequisite links |

### Modified: `node_dialogues` (additive fields)

| Field                | Type     | Description                                                        |
| -------------------- | -------- | ------------------------------------------------------------------ |
| currentScaffoldLevel | 0–4      | Current scaffold level for this dialogue                           |
| consecutiveSuccesses | number   | Counter for fade-down transitions                                  |
| consecutiveFailures  | number   | Counter for escalation transitions                                 |
| detectedConcepts     | string[] | Concepts detected in this dialogue's context                       |
| lastGapDetection     | object   | Most recent gap detection result (score, level, signals, rootGap)  |
| scaffoldHistory      | array    | Audit trail of level transitions `{ from, to, reason, timestamp }` |

### Migration Notes

- **Migration type:** Additive
- **Backwards compatible:** Yes — new fields are optional
- **Estimated migration duration:** < 1 minute (no data transformation needed)

---

## 8. Alternatives Considered

### Alternative A: Simple Keyword Detection Only

Use only linguistic pattern matching (like current MCP server) without probabilistic tracking.

| Pros                       | Cons                                                      |
| -------------------------- | --------------------------------------------------------- |
| Simple to implement        | No learning over time                                     |
| No state management needed | Can't distinguish temporary confusion from persistent gap |
| Works immediately          | No prerequisite awareness                                 |

**Reason for rejection:** Keyword detection is necessary but not sufficient. Research shows knowledge state changes over interactions — pure keyword matching treats each message independently, missing the learning trajectory.

### Alternative B: Full LLM-Based Assessment

Use LLM to assess knowledge state in every response.

| Pros                           | Cons                                     |
| ------------------------------ | ---------------------------------------- |
| More nuanced understanding     | Expensive (every message needs LLM call) |
| Can detect subtle gaps         | Non-deterministic results                |
| No manual prerequisite mapping | Slower response times                    |

**Reason for rejection:** Cost and latency concerns. BKT provides deterministic, fast knowledge tracking. LLM assessment can be added as a secondary signal for edge cases, not primary mechanism.

### Alternative C: User Self-Assessment

Ask users to rate their own knowledge before each topic.

| Pros                     | Cons                              |
| ------------------------ | --------------------------------- |
| Zero implementation cost | Users are poor judges of own gaps |
| User feels in control    | Interrupts flow                   |
|                          | Dunning-Kruger effect             |

**Reason for rejection:** Research consistently shows self-assessment is unreliable, especially for knowledge gaps (Dunning-Kruger effect). Behavioral signals are more accurate.

---

## 9. Security & Privacy Considerations

### Threat Surface

- **Knowledge Profile Exposure:** User knowledge states could reveal learning disabilities or skill gaps.
  - _Mitigation:_ Knowledge states are never exposed to other users. Admin endpoints require authentication.

- **Gamification Attack:** Users might try to game the system by pretending ignorance for easier content.
  - _Mitigation:_ Scaffold levels provide support but don't skip learning. Gaming results in more (not less) interaction.

### Data Sensitivity

| Data Element          | Classification | Handling Requirements                      |
| --------------------- | -------------- | ------------------------------------------ |
| Knowledge probability | Sensitive      | Per-user isolation, no cross-user access   |
| Gap detection signals | Internal       | Logged for debugging, not exposed to users |
| Prerequisite graphs   | Public         | Domain knowledge, not user-specific        |

### Authentication & Authorization

- Knowledge state endpoints require user authentication
- Admin/debug endpoints require elevated permissions
- No changes to existing auth flow

---

## 10. Performance & Scalability

| Metric                       | Current Baseline | Expected After Change | Acceptable Threshold |
| ---------------------------- | ---------------- | --------------------- | -------------------- |
| Response latency (p99)       | 1200ms           | 1250ms (+50ms)        | < 1500ms             |
| Knowledge state lookup       | N/A              | < 10ms                | < 50ms               |
| BKT update                   | N/A              | < 5ms                 | < 20ms               |
| Prerequisite check (depth=3) | N/A              | < 20ms                | < 100ms              |

### Known Bottlenecks

- **Prerequisite Graph Size:** Deep graphs (>5 levels) could slow recursive checking.
  - _Mitigation:_ Cap recursion depth at 3. Use caching for frequently-accessed concept graphs.

- **Knowledge State Storage:** High-volume users could accumulate many concept states.
  - _Mitigation:_ Prune states older than 90 days with no interactions. Index on `(userId, conceptId)`.

---

## 11. Observability

### Logging

- `knowledge_gap.detected` — Log when gap score > 0.5 with signals breakdown
- `knowledge_gap.scaffold_triggered` — Log scaffold level changes
- `knowledge_state.updated` — Log BKT updates (debug level)

### Metrics

- `mukti.knowledge_gap.score` (histogram) — Distribution of gap scores
- `mukti.scaffold_level.distribution` (gauge) — Current scaffold level breakdown
- `mukti.bkt.probability` (histogram) — Knowledge probability distribution
- `mukti.prerequisite_check.depth` (histogram) — How deep checks go

### Tracing

- Add span `knowledge_gap_detection` to dialogue processing trace
- Include `gap_score`, `scaffold_level`, `root_gap` as span attributes

### Alerting

| Alert Name              | Condition                                      | Severity | Runbook Link |
| ----------------------- | ---------------------------------------------- | -------- | ------------ |
| High Gap Detection Rate | gap_score > 0.7 for > 50% of dialogues over 1h | Warning  | [link]       |
| BKT Update Failures     | Error rate > 1% for 5m                         | Critical | [link]       |

---

## 12. Rollout Plan

### Phases

| Phase | Description                                      | Entry Criteria             | Exit Criteria              |
| ----- | ------------------------------------------------ | -------------------------- | -------------------------- |
| 1     | Shadow mode — detect but don't act               | Code merged, tests passing | 1 week data collection     |
| 2     | 10% canary — enable scaffolding for 10% of users | Shadow mode stable         | 2 weeks, positive feedback |
| 3     | General availability                             | Canary metrics positive    | N/A                        |

### Feature Flags

- **Flag name:** `knowledge_gap_detection_enabled`
- **Default state:** Off
- **Kill switch:** Yes

- **Flag name:** `scaffold_interventions_enabled`
- **Default state:** Off (shadow mode by default)
- **Kill switch:** Yes

### Rollback Strategy

1. Disable `scaffold_interventions_enabled` flag
2. If detection itself is problematic, disable `knowledge_gap_detection_enabled`
3. New dialogues immediately return to pure Socratic mode
4. No data migration needed for rollback

---

## 13. Open Questions

1. **Initial Prerequisite Graph Scope** — How many concepts should we map for v1? Proposal: Start with 50 core programming concepts (variables, loops, functions, recursion, OOP basics, data structures).

2. **BKT Parameter Tuning** — Should we use global defaults or attempt to personalize learning rates per user? Research suggests personalized is better but more complex.

3. **Concept Detection** — Resolved in implementation via keyword detection first, periodic LLM extraction fallback, and rate-limited concept auto-discovery.

4. **Cross-Session State** — Should knowledge state persist indefinitely or decay over time (forgetting curve)?

> **Reviewers:** Please reference open questions by number (e.g., "Regarding OQ-2, ...") in your comments.

---

## 14. Decision Log

| Date       | Decision                              | Rationale                                                                 | Decided By |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| 2026-02-28 | Use BKT over simpler mastery tracking | Research shows probabilistic tracking catches learning transitions better | RFC Author |
| 2026-02-28 | Cap prerequisite depth at 3           | Diminishing returns beyond 3 levels, performance concerns                 | RFC Author |
| 2026-02-28 | Additive schema changes only          | Backwards compatibility required for rollback safety                      | RFC Author |
| 2026-03-04 | Use gap-score thresholds for leveling | Deterministic scaffold mapping is easier to tune and test                 | RFC Author |
| 2026-03-04 | Add periodic LLM concept extraction   | Captures topic evolution beyond keyword-only detection                    | RFC Author |

---

## 15. References

- [RFC-0002: Adaptive Scaffolding Framework](../rfc-0002-adaptive-scaffolding-framework/index.md)
- [Carnegie Learning BKT Paper](https://www.cs.cmu.edu/~ggordon/yudelson-koedinger-gordon-individualized-bkt.pdf)
- [ALEKS Knowledge Space Theory](https://www.aleks.com/about_aleks/knowledge_space_theory)
- [RPKT: Recursive Prerequisite Knowledge Tracing (2025)](https://arxiv.org/abs/2501.xxxxx)
- [Mukti MCP Server Response Strategies](../../../../mukti-mcp-server/src/response-strategies.ts)
- [Unified Thinking Model](../../../reference/planning/unified-thinking-model.md)
- [GitHub Issue #3: Dynamic Resource Suggestion](https://github.com/mukti/mukti/issues/3)

---

> **Reviewer Notes:**
>
> WARNING: This RFC introduces new collections (`knowledge_states`, `concepts`) that will require database indexes for performance. Ensure index creation is part of migration script.
>
> This RFC is tightly coupled with RFC-0002 (Scaffolding). Review both together.
