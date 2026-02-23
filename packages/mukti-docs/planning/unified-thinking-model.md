# Unified Thinking Model: Branch Resolution & Chat-Canvas Convergence

## Introduction

This document addresses two interconnected challenges in Mukti's Socratic dialogue system:

1. **The Endless Dialogue Problem** - Elenchus conversations have no natural termination point. The AI is instructed to "never provide direct answers", which creates an infinite questioning loop with no mechanism for closure.
2. **The Two-World Problem** - Chat conversations and Thinking Canvas sessions are structurally isolated, despite representing the same underlying activity: structured thinking.

The solution proposed here unifies both by treating **every conversation as a thought graph** — displayed linearly in chat mode and spatially in canvas mode — with **branch-level resolution** replacing the concept of a single "ending".

---

## The Problem

### Why Conversations Never End

The current system prompt in `prompt-builder.ts` contains these instructions:

> "Your role is to ask thought-provoking questions, not provide answers."
> "Never provide direct answers or solutions."

This is philosophically correct but operationally broken. There is no instruction for when to **stop** asking questions, no signal detection for user understanding, and no mechanism for the user to "graduate" from a line of inquiry.

Real Socratic dialogues end. They end in one of three classical ways:

| Classical Ending | Description                               | User Signal                                       |
| ---------------- | ----------------------------------------- | ------------------------------------------------- |
| **Aporia**       | Productive puzzlement - user sees the gap | "I realize I don't actually know why I assumed X" |
| **Synthesis**    | User integrates multiple insights         | "So the real issue is X, not Y, because Z"        |
| **Praxis**       | User is ready to act                      | "I know what to try next"                         |

### Why Two Separate Systems

Currently, Mukti has two disconnected data models:

```mermaid
erDiagram
    Conversation {
        ObjectId _id
        string title
        string technique
        RecentMessage[] recentMessages
        ObjectId forkedFrom "exists but unused"
    }

    CanvasSession {
        ObjectId _id
        ProblemStructure problemStructure
        string[] exploredNodes
        NodePosition[] nodePositions
        RelationshipEdge[] relationshipEdges
    }

    NodeDialogue {
        ObjectId _id
        ObjectId sessionId
        string nodeId
        string nodeType
        number messageCount
    }

    InsightNode {
        ObjectId _id
        ObjectId sessionId
        string parentNodeId
        string label
        boolean isExplored
    }

    DialogueMessage {
        ObjectId _id
        ObjectId dialogueId
        string role
        string content
        number sequence
    }

    Conversation ||--o{ RecentMessage : contains
    CanvasSession ||--o{ NodeDialogue : has
    CanvasSession ||--o{ InsightNode : spawns
    NodeDialogue ||--o{ DialogueMessage : contains
    InsightNode }o--|| NodeDialogue : "explored via"
```

The `Conversation` model is linear (flat message array). The `CanvasSession` model is a graph (nodes with parent-child relationships via `InsightNode.parentNodeId`). But they represent the same cognitive activity viewed differently.

---

## Core Insight: Every Conversation is a Thought Graph

Instead of "chat vs canvas", the unified model treats all thinking as a graph structure with multiple **view modes**:

```mermaid
graph TD
    subgraph UnifiedModel["Unified Thinking Session"]
        TS[ThinkingSession]
        TS --> N1[ThoughtNode: Seed]
        TS --> N2[ThoughtNode: Root]
        TS --> N3[ThoughtNode: Soil]
        N1 --> N4[ThoughtNode: Insight A]
        N2 --> N5[ThoughtNode: Insight B]
        N4 --> N6[ThoughtNode: Insight C]
    end

    subgraph Views["View Modes"]
        V1["Chat View<br/>Traverse one path linearly"]
        V2["Canvas View<br/>See all paths spatially"]
        V3["Focus View<br/>Single node dialogue"]
    end

    UnifiedModel -.-> V1
    UnifiedModel -.-> V2
    UnifiedModel -.-> V3

    classDef sessionStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef nodeStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef viewStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000

    class TS sessionStyle
    class N1,N2,N3,N4,N5,N6 nodeStyle
    class V1,V2,V3 viewStyle
```

A chat conversation is just a **depth-first traversal** of the thought graph. A canvas session is the **full graph rendered spatially**. Converting between them is a change of view, not a data migration.

---

## Branch Resolution Model

### The Reframe

The question changes from:

> "How do we end the conversation?"

To:

> "How do we know when a **branch** is resolved, and when the **overall session** has reached a useful state?"

### Node States

Each node in the thought graph carries an independent resolution state:

```mermaid
stateDiagram-v2
    [*] --> Exploring: Node dialogue started

    Exploring --> Converging: Resolution signals detected
    Exploring --> Parked: User pauses exploration
    Exploring --> Branched: User spawns insight node

    Converging --> Resolved: User confirms understanding
    Converging --> Exploring: False positive / more questions

    Branched --> Resolved: Original thread concluded
    Branched --> Exploring: User returns to thread

    Parked --> Exploring: User resumes

    Resolved --> [*]
```

| State          | Description                                | Trigger                             |
| -------------- | ------------------------------------------ | ----------------------------------- |
| **Exploring**  | Active dialogue, Mukti is asking questions | Default state when dialogue starts  |
| **Converging** | User showing signs of understanding        | Resolution signals in user language |
| **Resolved**   | User reached conclusion for this node      | User confirms / passes teach-back   |
| **Branched**   | User spawned new questions from this node  | Insight node created from dialogue  |
| **Parked**     | User chose to pause, may return later      | Explicit user action or inactivity  |

### Session States

The overall thinking session aggregates node states:

```mermaid
stateDiagram-v2
    [*] --> Active: Session created

    Active --> Synthesizing: Multiple nodes resolved
    Active --> Dormant: Inactivity timeout

    Synthesizing --> Concluded: User marks complete
    Synthesizing --> Active: User explores more

    Dormant --> Active: User returns
    Dormant --> Concluded: User confirms done

    Concluded --> [*]
```

| State            | Condition                                                        |
| ---------------- | ---------------------------------------------------------------- |
| **Active**       | At least one node is `Exploring` or `Converging`                 |
| **Synthesizing** | Seed has at least one resolved path; AI offers synthesis         |
| **Concluded**    | User explicitly marks session complete                           |
| **Dormant**      | No activity for configured timeout; all active nodes auto-parked |

---

## Resolution Detection

### Per-Node Resolution Criteria

Different node types have different criteria for what constitutes "resolved":

```mermaid
flowchart TB
    subgraph Seed["Seed Node Resolution"]
        S1[User reframes problem<br/>with new understanding] --> SR[RESOLVED]
        S2[User spawns insight<br/>from problem exploration] --> SB[BRANCHED]
    end

    subgraph Root["Root Node Resolution"]
        R1[User finds evidence<br/>supporting assumption] --> RR1[RESOLVED: Validated]
        R2[User finds contradiction<br/>invalidating assumption] --> RR2[RESOLVED: Invalidated]
        R3[User determines assumption<br/>is irrelevant] --> RR3[RESOLVED: Discarded]
    end

    subgraph Soil["Soil Node Resolution"]
        C1[User confirms constraint<br/>is genuinely fixed] --> CR1[RESOLVED: Confirmed]
        C2[User discovers workaround<br/>or reframe] --> CR2[RESOLVED: Reframed]
    end

    subgraph Insight["Insight Node Resolution"]
        I1[User connects insight<br/>to concrete action] --> IR1[RESOLVED: Actionable]
        I2[User discovers deeper<br/>question from insight] --> IR2[BRANCHED]
    end

    classDef resolvedStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef branchedStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000

    class SR,RR1,RR2,RR3,CR1,CR2,IR1 resolvedStyle
    class SB,IR2 branchedStyle
```

### Resolution Signal Detection

The system monitors user messages for signals indicating convergence:

**Positive Resolution Signals** (user is reaching clarity):

- Summarizing without prompting: "So basically what this means is..."
- Connecting to action: "I think I should try..."
- Teaching back: "The reason this works is because..."
- Reframing: "Actually, the real question is..."
- Expressing confidence: "I understand now", "That makes sense"

**Anti-Resolution Signals** (user is frustrated, not resolved):

- Terse frustration: "whatever", "just tell me", "I give up"
- Topic jumping without connection
- Repeating the same question
- Decreasing response length with negative tone

**Ambiguous Signals** (need clarification):

- Short responses (could be satisfaction or disengagement)
- "OK" / "Got it" (genuine or dismissive)

When resolution signals are detected, the system transitions the node from `Exploring` to `Converging` and adjusts the AI's behavior.

---

## The Convergence Protocol

When a node enters `Converging` state, the AI's prompt shifts from pure questioning to validation:

```mermaid
flowchart TB
    Start([Node enters CONVERGING]) --> TeachBack["Victory Lap Question<br/>'Can you explain what you discovered<br/>and why it matters?'"]

    TeachBack --> Eval{User demonstrates<br/>understanding?}

    Eval -->|Clear articulation| Capture["Offer Insight Capture<br/>'Would you like to capture this<br/>as a resolved insight?'"]
    Eval -->|Partial / vague| Nudge["Targeted Follow-up<br/>'You're close - what about<br/>the connection to X?'"]
    Eval -->|Wrong / confused| Revert["Return to EXPLORING<br/>'Let's revisit - what made<br/>you think that?'"]

    Capture --> Choice{User chooses}

    Choice -->|Capture & move on| Resolve["Mark RESOLVED<br/>Store resolution summary<br/>Suggest next branch"]
    Choice -->|Explore deeper| Branch["Mark BRANCHED<br/>Create insight node<br/>Start new dialogue"]
    Choice -->|Keep going| Continue["Stay in CONVERGING<br/>Continue current thread"]

    Nudge --> TeachBack
    Revert --> Exploring([Return to EXPLORING])

    classDef startStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef resolvedStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef branchStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef questionStyle fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#000

    class Start startStyle
    class Resolve resolvedStyle
    class Branch branchStyle
    class TeachBack,Nudge,Revert questionStyle
```

### Prompt Augmentation for Convergence

When the node state is `converging`, the system prompt is augmented:

```
The user appears to be reaching clarity on this topic.

Your behavior should shift:
- If they demonstrate understanding, ask them to summarize their insight
- Offer to capture this as a resolved point
- Suggest exploring connected branches if relevant
- DO NOT keep asking new exploratory questions if the user has clearly reached a conclusion
- Validate their understanding, don't challenge it further unless it has gaps
```

This is the key addition to `prompt-builder.ts` that currently doesn't exist — **state-aware prompting**.

---

## Branch Point Mechanism

When the AI or user identifies a branching opportunity during dialogue, the system offers explicit choices:

```mermaid
flowchart LR
    Dialogue["Ongoing Dialogue<br/>on Node X"] --> Detect["Insight Detected<br/>'You just discovered Y'"]

    Detect --> Options["User Options"]

    Options --> O1["Capture & Continue<br/>Save insight, stay on X"]
    Options --> O2["Branch Off<br/>Create node Y,<br/>explore it now"]
    Options --> O3["Resolve Thread<br/>Mark X as resolved,<br/>return to overview"]
    Options --> O4["Keep Going<br/>Stay in current flow"]

    O1 --> NewInsight["InsightNode created<br/>parentNodeId: X<br/>state: parked"]
    O2 --> NewBranch["InsightNode created<br/>parentNodeId: X<br/>state: exploring<br/>New dialogue started"]
    O3 --> Resolved["Node X marked RESOLVED<br/>resolutionSummary stored"]
    O4 --> Dialogue

    classDef detectStyle fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#000
    classDef optionStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef resultStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000

    class Detect detectStyle
    class O1,O2,O3,O4 optionStyle
    class NewInsight,NewBranch,Resolved resultStyle
```

This creates the tree structure organically through conversation, rather than requiring the user to manually set up a canvas.

---

## Chat to Canvas Conversion

### Linear to Graph Transformation

When a user wants to "see their thinking" from a chat conversation:

```mermaid
flowchart TB
    subgraph Input["Chat Conversation (Linear)"]
        M1["msg 1: User states problem"]
        M2["msg 2: AI asks about assumptions"]
        M3["msg 3: User identifies assumption A"]
        M4["msg 4: AI challenges assumption A"]
        M5["msg 5: User realizes A is wrong"]
        M6["msg 6: AI asks about constraints"]
        M7["msg 7: User mentions constraint B"]
        M8["msg 8: User has insight C"]
        M9["msg 9: AI validates insight C"]

        M1 --> M2 --> M3 --> M4 --> M5 --> M6 --> M7 --> M8 --> M9
    end

    subgraph Analysis["Structural Analysis"]
        A1["Extract Problem Statement<br/>msgs 1-2 --> Seed"]
        A2["Extract Assumptions<br/>msgs 3-5 --> Root node"]
        A3["Extract Constraints<br/>msgs 6-7 --> Soil node"]
        A4["Extract Insights<br/>msgs 8-9 --> Insight node"]
    end

    subgraph Output["Canvas Graph"]
        Seed["Seed: Original Problem"]
        Root["Root: Assumption A<br/>state: RESOLVED (invalidated)<br/>msgs: 3-5"]
        Soil["Soil: Constraint B<br/>state: EXPLORING<br/>msgs: 6-7"]
        Insight["Insight: Discovery C<br/>state: CONVERGING<br/>msgs: 8-9"]

        Seed --> Root
        Seed --> Soil
        Root --> Insight
    end

    Input --> Analysis
    Analysis --> Output

    classDef inputStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef analysisStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef outputStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000

    class M1,M2,M3,M4,M5,M6,M7,M8,M9 inputStyle
    class A1,A2,A3,A4 analysisStyle
    class Seed,Root,Soil,Insight outputStyle
```

### Conversion Data Structure

Each extracted node references back to the original messages:

```typescript
interface ConversationNode {
  messageRange: [startSequence: number, endSequence: number];
  type: 'seed' | 'soil' | 'root' | 'insight';
  label: string; // AI-extracted key point
  state: NodeState; // Inferred from dialogue progression
  parentId?: string; // Which node this branched from
}
```

### Canvas to Chat Linearization

The reverse operation traverses the graph depth-first and concatenates dialogues:

```mermaid
flowchart LR
    subgraph Graph["Canvas Graph"]
        GS[Seed] --> GR1[Root 1<br/>RESOLVED]
        GS --> GR2[Root 2<br/>EXPLORING]
        GR1 --> GI1[Insight A<br/>RESOLVED]
        GR2 --> GI2[Insight B<br/>PARKED]
    end

    subgraph Linear["Linearized Chat"]
        L1["Section: Problem Statement<br/>(Seed dialogue)"]
        L2["Section: Assumption 1<br/>(Root 1 dialogue) RESOLVED"]
        L3["Section: Discovery A<br/>(Insight A dialogue) RESOLVED"]
        L4["Section: Assumption 2<br/>(Root 2 dialogue) IN PROGRESS"]
        L5["Section: Observation B<br/>(Insight B dialogue) PAUSED"]

        L1 --> L2 --> L3 --> L4 --> L5
    end

    Graph --> Linear

    classDef resolvedStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef activeStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef parkedStyle fill:#eeeeee,stroke:#757575,stroke-width:2px,color:#000

    class GR1,GI1 resolvedStyle
    class GR2 activeStyle
    class GI2 parkedStyle
```

---

## The Synthesis Phase

When the session reaches a state where enough branches are resolved, the system enters **Synthesis Mode** — the natural conclusion of a thinking session.

### Synthesis Trigger Conditions

```mermaid
flowchart TB
    Check{Synthesis<br/>Conditions Met?}

    Cond1["Seed node has at least<br/>one resolved path"] --> Check
    Cond2["Majority of root nodes<br/>are resolved or parked"] --> Check
    Cond3["User explicitly requests<br/>synthesis"] --> Check

    Check -->|Any condition met| Enter["Enter SYNTHESIZING State"]
    Check -->|None met| Continue["Continue ACTIVE State"]

    Enter --> SynthPrompt["AI Offers Synthesis<br/>'You've explored several angles...<br/>Would you like to bring it together?'"]

    SynthPrompt --> UserChoice{User Response}

    UserChoice -->|Synthesize| Generate["Generate Session Summary<br/>Key insights, open questions,<br/>next steps"]
    UserChoice -->|Keep exploring| Continue
    UserChoice -->|Conclude| Conclude["Mark Session CONCLUDED<br/>Store synthesis data"]

    classDef condStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef synthStyle fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#000
    classDef doneStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000

    class Cond1,Cond2,Cond3 condStyle
    class SynthPrompt,Generate synthStyle
    class Conclude doneStyle
```

### Synthesis Output Structure

When the user chooses to synthesize:

```typescript
interface SynthesisData {
  /** Key insights discovered across all branches */
  keyInsights: string[];
  /** Questions that remain open for future exploration */
  openQuestions: string[];
  /** Concrete next steps the user identified */
  nextSteps: string[];
  /** User's own reflection on the thinking process */
  userReflection?: string;
  /** Map of node resolutions */
  nodeResolutions: Record<
    string,
    {
      state: NodeState;
      summary: string;
    }
  >;
}
```

The synthesis is NOT AI-generated content — it is the user's own articulation, guided by Mukti's prompts. This preserves the core philosophy.

---

## Multi-Ending Example

A single thinking session can have multiple valid conclusions across its branches:

```mermaid
graph TD
    Seed["Seed: 'My React app is slow'<br/>State: RESOLVED"]

    Seed --> Root1["Root: 'It's the database'<br/>State: RESOLVED<br/>Validated - slow queries confirmed"]
    Seed --> Root2["Root: 'It's the rendering'<br/>State: RESOLVED<br/>Invalidated - profiler showed OK"]
    Seed --> Soil1["Soil: 'Can't change the ORM'<br/>State: RESOLVED<br/>Confirmed - contractual obligation"]

    Root1 --> Insight1["Insight: 'Need query indexing'<br/>State: RESOLVED<br/>Action: Add compound index"]
    Root1 --> Insight2["Insight: 'N+1 query pattern'<br/>State: RESOLVED<br/>Action: Batch loading"]

    Root2 --> Insight3["Insight: 'Maybe it's API calls'<br/>State: EXPLORING<br/>Still investigating..."]

    Insight1 --> Insight4["Insight: '50% latency drop after index'<br/>State: RESOLVED<br/>Outcome verified"]

    classDef resolved fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef exploring fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef invalidated fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000

    class Seed,Root1,Soil1,Insight1,Insight2,Insight4 resolved
    class Root2 invalidated
    class Insight3 exploring
```

The session is "complete enough" when:

1. The original seed has at least one resolved path to an actionable insight
2. The user has explored the branches they care about
3. The user explicitly chooses to conclude, or
4. Inactivity plus majority resolved branches triggers a synthesis suggestion

There is no single "right answer". The thought graph IS the answer.

---

## Schema Additions

### NodeDialogue Schema Extensions

New fields for node-level state tracking:

```typescript
// Add to node-dialogue.schema.ts

/** Current resolution state of this dialogue thread */
@Prop({
  enum: ['exploring', 'converging', 'resolved', 'branched', 'parked'],
  default: 'exploring',
  type: String,
})
state: NodeState;

/** AI or user-generated summary of the conclusion reached */
@Prop({ type: String })
resolutionSummary?: string;

/** How the node was resolved (validated, invalidated, reframed, actionable, discarded) */
@Prop({
  enum: ['validated', 'invalidated', 'reframed', 'actionable', 'discarded'],
  type: String,
})
resolutionType?: ResolutionType;

/** Insight node IDs that were spawned from this dialogue */
@Prop({ default: [], type: [String] })
spawnedInsightIds: string[];
```

### CanvasSession / ThinkingSession Schema Extensions

New fields for session-level state and synthesis:

```typescript
// Add to canvas-session.schema.ts (or new thinking-session.schema.ts)

/** Overall session state */
@Prop({
  enum: ['active', 'synthesizing', 'concluded', 'dormant'],
  default: 'active',
  type: String,
})
sessionState: SessionState;

/** Synthesis data generated when user concludes the session */
@Prop({ type: Object })
synthesisData?: {
  keyInsights: string[];
  openQuestions: string[];
  nextSteps: string[];
  userReflection?: string;
  nodeResolutions: Record<string, { state: string; summary: string }>;
};

/** Reference to source conversation if converted from chat */
@Prop({ type: Types.ObjectId, ref: 'Conversation' })
sourceConversationId?: Types.ObjectId;

/** Reference to generated canvas if converted from chat */
@Prop({ type: Types.ObjectId, ref: 'CanvasSession' })
linkedCanvasId?: Types.ObjectId;
```

### Conversation Schema Extensions

New fields for chat-side tracking:

```typescript
// Add to conversation.schema.ts

/** Overall thinking state of the conversation */
@Prop({
  enum: ['active', 'synthesizing', 'concluded', 'dormant'],
  default: 'active',
  type: String,
})
sessionState: SessionState;

/** Reference to canvas session if user visualized this conversation */
@Prop({ type: Types.ObjectId, ref: 'CanvasSession' })
linkedCanvasId?: Types.ObjectId;

/** Extracted thought nodes from conversation analysis (for conversion) */
@Prop({ default: [], type: [Object] })
extractedNodes?: ConversationNode[];
```

---

## Prompt Builder Extensions

### State-Aware Prompt Augmentation

The `buildSystemPrompt` function in `prompt-builder.ts` should be extended to accept node state:

```typescript
function getStateAwarePrompt(state: NodeState): string {
  switch (state) {
    case 'exploring':
      return ''; // Default behavior, no augmentation needed

    case 'converging':
      return `
The user appears to be reaching clarity on this topic.
Your behavior should shift:
- If they demonstrate understanding, ask them to summarize their insight
- Offer to capture this as a resolved point
- Suggest exploring connected branches if relevant
- DO NOT keep asking new exploratory questions if the user has clearly reached a conclusion
- Validate their understanding rather than challenging further (unless gaps exist)`;

    case 'resolved':
      return `
This thread has been resolved. The user reached the following conclusion:
[resolutionSummary]
If they return to this thread, help them reflect on the conclusion or explore new angles.
Do not re-open resolved questions unless the user explicitly wants to revisit.`;

    case 'parked':
      return `
The user previously paused this exploration. Help them re-orient:
- Briefly summarize where they left off
- Ask what prompted them to return
- Offer to continue from where they stopped or take a fresh angle`;

    default:
      return '';
  }
}
```

### Synthesis Prompt

When the session enters synthesizing state:

```typescript
const synthesisPrompt = `
The user has explored multiple aspects of their problem. Help them synthesize:

Resolved branches:
${resolvedNodes.map((n) => `- ${n.nodeLabel}: ${n.resolutionSummary}`).join('\n')}

Open branches:
${openNodes.map((n) => `- ${n.nodeLabel}: Still exploring`).join('\n')}

Guide the user to:
1. Articulate what they learned across all branches
2. Identify what questions remain open
3. Define concrete next steps
4. Reflect on how their understanding changed

Do NOT summarize for them. Ask them to do it themselves.
The synthesis must come from the user's own thinking.`;
```

---

## Full Lifecycle Flow

```mermaid
flowchart TB
    subgraph Start["Session Start"]
        UserStart([User begins thinking]) --> Mode{Start Mode}
        Mode -->|Chat| CreateConv["Create Conversation<br/>sessionState: active"]
        Mode -->|Canvas| CreateCanvas["Create CanvasSession<br/>sessionState: active"]
    end

    subgraph Dialogue["Active Dialogue"]
        CreateConv --> Explore["EXPLORING<br/>AI asks Socratic questions"]
        CreateCanvas --> Explore

        Explore --> SignalCheck{Resolution<br/>signals detected?}

        SignalCheck -->|Yes| Converge["CONVERGING<br/>AI shifts to validation"]
        SignalCheck -->|No| Explore

        Converge --> TeachBack["Victory Lap<br/>'Explain what you discovered'"]

        TeachBack --> Quality{Understanding<br/>demonstrated?}

        Quality -->|Yes| OfferCapture["Offer Capture<br/>'Resolve, Branch,<br/>or Keep Going?'"]
        Quality -->|Partial| Converge
        Quality -->|No| Explore
    end

    subgraph Resolution["Branch Resolution"]
        OfferCapture --> UserDecision{User Choice}

        UserDecision -->|Resolve| MarkResolved["Mark Node RESOLVED<br/>Store summary"]
        UserDecision -->|Branch| SpawnInsight["Create InsightNode<br/>Start new dialogue"]
        UserDecision -->|Continue| Explore
        UserDecision -->|Park| MarkParked["Mark Node PARKED"]
    end

    subgraph Synthesis["Session Synthesis"]
        MarkResolved --> SessionCheck{Synthesis<br/>conditions met?}
        SpawnInsight --> Explore

        SessionCheck -->|Yes| OfferSynth["AI Offers Synthesis<br/>'Bring it all together?'"]
        SessionCheck -->|No| NextNode["Move to next<br/>unresolved node"]

        NextNode --> Explore

        OfferSynth --> SynthChoice{User Choice}

        SynthChoice -->|Synthesize| UserSynthesis["User articulates<br/>key insights + next steps"]
        SynthChoice -->|Explore more| Explore
        SynthChoice -->|Conclude| Conclude
    end

    subgraph Complete["Session Conclusion"]
        UserSynthesis --> Conclude["Mark CONCLUDED<br/>Store synthesis data"]
        Conclude --> Convert{Convert?}

        Convert -->|Chat to Canvas| GenerateGraph["Generate thought graph<br/>from conversation"]
        Convert -->|Canvas to Chat| LinearizePath["Linearize selected<br/>path through graph"]
        Convert -->|No| Done([Session Complete])

        GenerateGraph --> Done
        LinearizePath --> Done
    end

    classDef startStyle fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef exploreStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef convergeStyle fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#000
    classDef resolveStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef synthStyle fill:#fce4ec,stroke:#ad1457,stroke-width:2px,color:#000
    classDef doneStyle fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#000

    class UserStart,CreateConv,CreateCanvas startStyle
    class Explore,SignalCheck exploreStyle
    class Converge,TeachBack,Quality convergeStyle
    class MarkResolved,SpawnInsight,OfferCapture resolveStyle
    class OfferSynth,UserSynthesis synthStyle
    class Conclude,Done doneStyle
```

---

## Implementation Roadmap

### Phase 1: Node State Tracking

- Add `state`, `resolutionSummary`, `resolutionType`, and `spawnedInsightIds` to `NodeDialogue` schema
- Add `sessionState` and `synthesisData` to `CanvasSession` schema
- Update `prompt-builder.ts` with state-aware prompt augmentation
- Implement basic resolution signal detection (keyword matching)

### Phase 2: Convergence Protocol

- Implement `Converging` state transition logic in dialogue queue service
- Build "Victory Lap" prompt generation
- Add branch point detection and insight spawning from dialogue
- Implement user choice handling (resolve / branch / park / continue)

### Phase 3: Synthesis Engine

- Implement synthesis trigger conditions
- Build synthesis prompt generation
- Create synthesis data structure and storage
- Add session conclusion flow

### Phase 4: Chat-Canvas Conversion

- Build conversation analysis for structure extraction (chat to graph)
- Implement graph traversal for linearization (canvas to chat)
- Add `linkedCanvasId` and `sourceConversationId` references
- Build conversion API endpoints

### Phase 5: Advanced Signal Detection

- Replace keyword matching with LLM-based resolution signal analysis
- Add confidence scoring for convergence detection
- Implement adaptive thresholds based on user patterns
- Track resolution accuracy and refine over time
