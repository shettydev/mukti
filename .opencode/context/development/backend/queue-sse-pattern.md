<!-- Context: development/backend/queue-sse-pattern | Priority: critical | Version: 1.0 | Updated: 2026-03-21 -->

# Queue + SSE Pattern — Mukti AI Processing

**Purpose**: How Mukti processes AI requests asynchronously with BullMQ and streams results via SSE

---

## Overview

Every AI message in Mukti (Conversations and Dialogue) follows this two-phase flow:

```
Client                   API                    BullMQ               StreamService
  │                        │                       │                       │
  ├─POST /messages──────►  │                       │                       │
  │                        ├─enqueueRequest()─────►│                       │
  │  ◄─202 {jobId,pos}─────┤                       │                       │
  │                        │                       │                       │
  ├─GET /stream (SSE)────► │                       │                       │
  │  ◄─stream open──────── │                       │                       │
  │                        │                       │                       │
  │                        │                       ├─process()─────────────►
  │  ◄─processing event──  │  ◄─emitToConversation()──────────────────────┤
  │  ◄─progress event────  │  ◄─emitToConversation()──────────────────────┤
  │  ◄─message (user)────  │  ◄─emitToConversation()──────────────────────┤
  │  ◄─message (ai)──────  │  ◄─emitToConversation()──────────────────────┤
  │  ◄─complete event────  │  ◄─emitToConversation()──────────────────────┤
```

---

## Phase 1: Enqueue (POST → 202)

```typescript
// In QueueService
async enqueueRequest(userId, conversationId, message, tier, technique, model, usedByok) {
  const priority = tier === 'paid' ? 10 : 1;      // Paid users get higher priority
  const job = await this.queue.add('process-conversation-request', jobData, { priority });
  return { jobId: job.id!, position };
}
```

**Queue name**: `conversation-requests` (Dialogue uses `dialogue-requests`)  
**Priority**: `paid = 10`, `free = 1`  
**Retry**: BullMQ default with exponential backoff

---

## Phase 2: Process (Worker)

`QueueService extends WorkerHost` — `@Processor('conversation-requests')` marks it as consumer.

Processing order inside `process(job)`:

1. Emit `processing` event via StreamService
2. Load conversation + technique from MongoDB
3. Resolve BYOK key or server key
4. Run RFC-0001 gap detection + RFC-0004 quality assessment **in parallel** (`Promise.all`)
5. Build scaffold context from gap result
6. Build prompt (`openRouterService.buildPrompt(...)`)
7. Emit `progress` event
8. Call `openRouterService.sendChatCompletion(...)`
9. Persist messages + scaffold/quality state to MongoDB
10. Emit `message` (user) + `message` (ai) events
11. Archive if `recentMessages.length > 50`
12. Log `UsageEvent`
13. Emit `complete` event

On error: emit `error` event, then `throw` to trigger BullMQ retry.

---

## Phase 3: Stream (SSE)

### Server — `StreamService`

```typescript
// In-memory Map: conversationId → StreamConnection[]
private readonly connections = new Map<string, StreamConnection[]>();

// Called from controller @Sse endpoint
addConnection(conversationId, userId, connectionId, emitFn): void

// Called by QueueService worker after AI response
emitToConversation(conversationId, event): void   // broadcasts to all connections
emitToUser(conversationId, userId, event): void   // user-specific events

// Called on Observable teardown (client disconnect)
removeConnection(conversationId, connectionId): void
```

### Server — Controller SSE endpoint

```typescript
@Sse(':id/stream')
async streamConversation(@Param('id') id: string, @CurrentUser() user: User): Promise<Observable<MessageEvent>> {
  await this.conversationService.findConversationById(id, user._id.toString());  // Auth check

  return new Observable<MessageEvent>((observer) => {
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.streamService.addConnection(id, user._id.toString(), connectionId,
      (event) => observer.next({ data: event, type: 'message' } as MessageEvent)
    );
    return () => this.streamService.removeConnection(id, connectionId);  // Cleanup on disconnect
  });
}
```

### Client — EventSource

```typescript
const source = new EventSource(`/api/v1/conversations/${id}/stream`, { withCredentials: true });
source.addEventListener('message', (e) => {
  const event = JSON.parse(e.data);
  // event.type: 'processing' | 'progress' | 'message' | 'complete' | 'error'
});
```

---

## SSE Event Reference

| Type         | When                   | Key Fields                                               |
| ------------ | ---------------------- | -------------------------------------------------------- |
| `processing` | Job starts in worker   | `jobId`, `status: 'started'`                             |
| `progress`   | Mid-processing updates | `jobId`, `status: string`, `position?`                   |
| `message`    | User msg + AI response | `role`, `content`, `sequence`, `timestamp`, `tokens?`    |
| `complete`   | Job finished           | `jobId`, `cost`, `tokens`, `latency`, `conclusionReady?` |
| `error`      | Job failed             | `code`, `message`, `retriable: boolean`                  |

All events include top-level: `conversationId`, `timestamp` (ISO 8601).

---

## Dialogue Module — Same Pattern

`DialogueModule` uses identical pattern with separate queue `dialogue-requests`, keyed on `sessionId:nodeId`.  
`DialogueStreamService` manages connections keyed by `${sessionId}:${nodeId}`.

---

## Codebase References

- Queue service: `packages/mukti-api/src/modules/conversations/services/queue.service.ts`
- Stream service: `packages/mukti-api/src/modules/conversations/services/stream.service.ts`
- Controller SSE: `packages/mukti-api/src/modules/conversations/conversation.controller.ts` (`streamConversation`)
- Dialogue queue: `packages/mukti-api/src/modules/dialogue/services/`
- BullMQ module setup: `packages/mukti-api/src/modules/conversations/conversations.module.ts`
