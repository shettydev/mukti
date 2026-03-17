## Goal

The user wants to improve the default opening message that appears in the Socratic Dialogue panel when a branch node is created in the Thought Map canvas. Currently the opener is a static, generic template:

> "You've noted: 'Closed Source'. What led you to this thought? Is this an observation, an assumption, or a conclusion?"
> The goal is to make it **context-aware, interactive, and aligned with Mukti's Socratic philosophy** by implementing three improvements:

1. **#1 — Context-aware openers via Technique Selection** (RFC §5.1.1): Different opening questions based on which Socratic technique is algorithmically selected for the node (based on depth, siblings, fromSuggestion, nodeType)
2. **#2 — Interactive quick-reply buttons**: 3 clickable starters shown below the first message; clicking one sends that text as the user's message and hides the bar
3. **#3 — Parent-child relationship awareness**: The opener always references the parent node's label when one exists

---

## Instructions

- The project is **Mukti** — a Socratic AI thinking tool. Core philosophy: "more questions than answers." Every change must preserve this — openers should be questions that provoke thinking, never statements or answers.
- Reference document: `docs/rfcs/active/rfc-0003-thought-map/index.md` — specifically §5.1.1 (Context-Aware Technique Selection algorithm) which is already implemented in the backend.
- The implementation prompt has already been fully written and is ready to be executed. The agent should follow the 7-step plan exactly in order.
- Do NOT modify `generateThoughtMapInitialQuestion()` — it is still used by the existing Guided Canvas (seed/soil/root nodes). Only ADD new functions.
- Match Japandi aesthetic for the new `QuickReplyBar` UI component (muted colors, pill buttons, subtle borders, no heavy shadows).
- Lint commands: `bun nx run @mukti/api:lint` and `bun nx run @mukti/web:lint`
- Commit when done: `bun run commit` (czg) or `bun run ai:commit`

---

## Discoveries

### Architecture Findings (from reading actual source files)

**The static opener source:**

- Lives in `generateThoughtMapInitialQuestion()` in `packages/mukti-api/src/modules/dialogue/utils/prompt-builder.ts`
- The `thought` node case returns the exact static string shown in the screenshot
- Called in `ThoughtMapDialogueController.startDialogue()` (POST `:mapId/nodes/:nodeId/start`)
  **What is already implemented (do not re-implement):**
- `selectTechniqueForNode()` — RFC §5.1.1 algorithm is **fully implemented** in `prompt-builder.ts` and exported. It is used in the queue worker (`ThoughtMapDialogueQueueService.process()`) for AI responses but NOT in `startDialogue()`.
- `resolveNodeContext()` — private method on `ThoughtMapDialogueController` that **already fetches** depth, siblings, parentType, fromSuggestion by querying MongoDB. It is called by `sendMessage()` but NOT by `startDialogue()` (which uses the dumber `resolveNodeInfo()` instead).
  **The gap (what needs to change):**
- `startDialogue()` calls `resolveNodeInfo()` → only gets `nodeLabel` + `nodeType`
- It needs to call `resolveNodeContext()` instead, which already has all the context — just needs `parentLabel` added to its return value (the `parentNode` is already fetched, just not returned)
  **API response shape for `startDialogue`:**
  { "data": { "dialogue": {...}, "initialQuestion": {...} } }
  Needs `"quickReplies": [...]` added to `data`.
  **Frontend flow:**
- `ThoughtMapDialoguePanel` mounts → calls `useStartThoughtMapDialogue(mapId, node.nodeId)` → which calls `POST .../start`
- `useStartThoughtMapDialogue` hook seeds the TanStack Query messages cache with `response.initialQuestion`
- Messages rendered via reused `<ChatMessage>` component from the canvas
- No quick reply UI exists anywhere yet
  **Technique selection algorithm** (from `selectTechniqueForNode()` in `prompt-builder.ts`):
  depth === 0 → maieutics
  fromSuggestion → elenchus
  type === 'insight' → dialectic
  siblings >= 3 → counterfactual
  depth >= 3 → analogical
  parentType==='question'→ definitional
  default → maieutics

---

## Accomplished

### Brainstorming Phase ✅ COMPLETE

- Identified 8 improvement ideas for the branch node opener
- User selected combination of **#1 + #2 + #3** to implement

### Implementation Prompt ✅ COMPLETE

A detailed, copy-pasteable 7-step implementation prompt was written and is ready to be executed. No code has been written yet.

### Code Implementation ❌ NOT STARTED

All 7 steps are pending:

- **Step 1** — Add `parentLabel` to `resolveNodeContext()` return type in controller
- **Step 2** — Add `generateContextAwareInitialQuestion()` and `getQuickRepliesForTechnique()` to `prompt-builder.ts`
- **Step 3** — Update `startDialogue()` to use context, technique selection, new opener function, and return `quickReplies`
- **Step 4** — Add `QuickReply` interface to frontend types/API client; update `StartDialogueResponse`
- **Step 5** — Verify `useStartThoughtMapDialogue` surfaces `quickReplies` from mutation data
- **Step 6** — Create new `QuickReplyBar` component
- **Step 7** — Wire `QuickReplyBar` into `ThoughtMapDialoguePanel` with state management

---

## Relevant Files / Directories

### Backend (`packages/mukti-api/`)

| File                                                                     | Status                | Notes                                                                                                                                                  |
| ------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/dialogue/utils/prompt-builder.ts`                           | Read, **needs edits** | Add `generateContextAwareInitialQuestion()`, `getQuickRepliesForTechnique()`, `QuickReply` interface, `ContextAwareOpenerParams` interface             |
| `src/modules/thought-map/thought-map-dialogue.controller.ts`             | Read, **needs edits** | Update `resolveNodeContext()` return to include `parentLabel`; rewrite `startDialogue()` to use context + technique + new opener + return quickReplies |
| `src/modules/thought-map/services/thought-map-dialogue-queue.service.ts` | Read (reference only) | Already correctly uses `selectTechniqueForNode()` — no changes needed                                                                                  |
| `src/modules/dialogue/dto/dialogue-response.dto.ts`                      | Read (reference only) | No changes needed                                                                                                                                      |
| `src/schemas/thought-node.schema.ts`                                     | Referenced            | No changes needed                                                                                                                                      |
| `docs/rfcs/active/rfc-0003-thought-map/index.md`                         | Read (spec reference) | RFC for Thought Map — §5.1.1 is the technique selection spec                                                                                           |

### Frontend (`packages/mukti-web/`)

| File                                                     | Status                              | Notes                                                                                                                                                                       |
| -------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/thought-map/ThoughtMapDialoguePanel.tsx` | Read, **needs edits**               | Add `quickReplies` + `quickRepliesVisible` state; capture from `startData`; render `QuickReplyBar` after first message; `handleQuickReply` handler; hide bar on custom send |
| `src/components/thought-map/QuickReplyBar.tsx`           | **Does not exist — needs creation** | New pill-button component; controlled by parent; Japandi aesthetic                                                                                                          |
| `src/lib/hooks/use-thought-map-dialogue.ts`              | Read, **verify only**               | Confirm `startData?.quickReplies` resolves correctly through any envelope unwrapping                                                                                        |
| `src/lib/api/thought-map-dialogue.ts`                    | Read, **needs edits**               | Add `QuickReply` interface; add `quickReplies: QuickReply[]` to `StartDialogueResponse`                                                                                     |
| `src/types/thought-map.ts`                               | Read (reference)                    | May need `QuickReply` type added or re-exported depending on existing patterns                                                                                              |
| `src/types/dialogue.types.ts`                            | Read (reference only)               | Existing dialogue types — no changes needed                                                                                                                                 |
| `src/components/canvas/chat/chat-message.tsx`            | Read (reference)                    | Study for style conventions before building `QuickReplyBar`                                                                                                                 |

▣ Compaction · claude-sonnet-4.6 · 42.3s
│ Task Discover context files for implementation
└ 31 toolcalls · 1m 37s
ctrl+x down view subagents
The context files are confirmed. Here's a summary of what we've accomplished and the clear next steps:

---

## Current State

✅ **Research & Design** — Complete
✅ **Architecture analysis** — Complete (all relevant files read, gaps identified)
✅ **Implementation plan** — Complete (7-step plan ready)
✅ **Context discovery** — Complete (8 context files found)
❌ **Code implementation** — Not started

---

## Ready to Implement

The 7-step plan is fully defined and approved from our prior session:
| Step | What | Where |
|---|---|---|
| 1 | Add `parentLabel` to `resolveNodeContext()` return | `thought-map-dialogue.controller.ts` |
| 2 | Add `generateContextAwareInitialQuestion()` + `getQuickRepliesForTechnique()` | `prompt-builder.ts` |
| 3 | Update `startDialogue()` to use context + technique + new opener + return `quickReplies` | `thought-map-dialogue.controller.ts` |
| 4 | Add `QuickReply` interface + update `StartDialogueResponse` | `thought-map-dialogue.ts` (API client) |
| 5 | Verify `quickReplies` surfaces through `useStartThoughtMapDialogue` hook | `use-thought-map-dialogue.ts` |
| 6 | Create new `QuickReplyBar` component | `QuickReplyBar.tsx` (new file) |
| 7 | Wire `QuickReplyBar` into `ThoughtMapDialoguePanel` | `ThoughtMapDialoguePanel.tsx` |
