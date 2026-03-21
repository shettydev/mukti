<!-- Context: data/navigation | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Mukti — Data Architecture

**Purpose**: MongoDB schemas, data relationships, and query patterns.

---

## Database: MongoDB 7 + Mongoose 8

### Core Domain Schemas

| Schema            | Purpose                              | Key Fields                         |
| ----------------- | ------------------------------------ | ---------------------------------- |
| `User`            | User accounts                        | email, password, roles, googleId   |
| `Subscription`    | User subscription tier               | userId (1:1 with User)             |
| `Conversation`    | Text-based Socratic sessions         | userId, technique, title, messages |
| `CanvasSession`   | Thinking Canvas sessions             | userId, nodes, edges, title        |
| `NodeDialogue`    | Per-node conversations within canvas | sessionId, nodeId (unique pair)    |
| `DialogueMessage` | Messages within node dialogues       | dialogueId, role, content          |
| `InsightNode`     | Generated insights from canvas       | sessionId, content, sourceNodes    |

### Knowledge Tracing Schemas (RFC-0001)

| Schema           | Purpose                                      | Key Fields                              |
| ---------------- | -------------------------------------------- | --------------------------------------- |
| `Concept`        | Knowledge concepts (DAG via prerequisites[]) | name, prerequisites[]                   |
| `KnowledgeState` | User × Concept mastery                       | userId, conceptId (unique pair), pKnown |
| `Technique`      | Socratic technique definitions               | name, type, description                 |

### Supporting Schemas

| Schema                | Purpose                            |
| --------------------- | ---------------------------------- |
| `RefreshToken`        | JWT refresh token rotation         |
| `Session`             | Active user sessions               |
| `SharedLink`          | Public canvas/conversation sharing |
| `UsageEvent`          | AI usage tracking                  |
| `DailyUsageAggregate` | Aggregated daily usage stats       |
| `RequestQueue`        | Queue state persistence            |
| `RateLimit`           | Rate limiting state                |
| `ArchivedMessage`     | Archived conversation messages     |
| `Vote`                | Community votes                    |
| `Resource`            | Learning resources                 |
| `Waitlist`            | Pre-launch waitlist                |

---

## Key Relationships

```
User ──1:1──► Subscription
User ──1:N──► Conversation
User ──1:N──► CanvasSession
CanvasSession ──1:N──► NodeDialogue (unique on sessionId + nodeId)
Concept ──DAG──► Concept[] (via prerequisites[])
KnowledgeState ──► User × Concept (unique on userId + conceptId)
```

---

## Schema Registration

All schemas registered in `packages/mukti-api/src/schemas/index.ts` via `ALL_SCHEMAS` array. New schemas must be added there AND registered in `DatabaseModule`.

---

## Cache: Redis 7

- BullMQ job queues (`conversation-requests`, `dialogue-requests`)
- Session caching
- Rate limit counters

---

## Related

- **API Patterns** → `../project/mukti-api-patterns.md`
- **Technical Domain** → `../project-intelligence/technical-domain.md`
