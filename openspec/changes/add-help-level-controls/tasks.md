# Tasks

## 1. Response formats and turn kind (engine)

- [x] 1.1 Add `SOCRATIC_EXPLANATION_FORMAT` (`{explanation}`) and `SOCRATIC_SUMMARY_FORMAT` (`{summary}`) beside `SOCRATIC_QUESTION_FORMAT` in `ai/types/ai-response-format.interface.ts`; verify with a unit test that the Antigravity adapter's `unwrap` returns the text for both new single-field shapes
- [x] 1.2 Add `HelpControl` type and `turnKind` resolution to `SocraticTurnEngine.prepare` (`helpControl`, `turnBudget`, `exchangesSoFar` on `PrepareTurnInput`; `turnKind` and `responseFormat` on `PreparedTurn`), budget-reached beating any control; verify with engine unit tests for every row of design D2
- [x] 1.3 Add a test asserting `responseFormat` is the question shape for `ordinary` and `more_help` at every level 0-4, explanation shape for `explain`, summary shape for `wrap_up` (ai-response-format delta scenarios)

## 2. More help

- [x] 2.1 Add `ScaffoldFadeService.manualRaise` built on the existing `forceLevel` (stored+1 capped at 4, counters reset, "Manual: learner requested more help" recorded); verify with unit tests plus a fast-check property that the result is always `min(level+1, 4)`
- [x] 2.2 In the engine, raise the prompt level for `more_help` in `prepare` and replace the evaluated transition with the manual one in `settle`, keeping BKT updates; verify with engine tests for "More help from level 1", "at the top level" and "fading still applies" scenarios

## 3. Explain

- [x] 3.1 Add `EXPLAIN_INSTRUCTION` as a quality directive (one missing piece, ≤ ~120 words, ≤ 1 short example, no trailing question, never the complete solution even if asked) and emit it from `DialogueQualityService` when `turnKind === 'explain'`; verify the directive text and priority in a unit test
- [x] 3.2 Keep the stored level and counters unchanged on `explain` in `settle` while recording concepts as not-demonstrated; verify with an engine test ("Explain does not count as a failure")
- [x] 3.3 Pass `turnKind` to `inspectReply`: suppress the zero-question note for explain/summary, and log a violation when an explain reply ends with `?`, has a fenced code block over 8 lines, or exceeds 180 words; verify with monitor unit tests

## 4. Wrap up and summary

- [x] 4.1 Rewrite `CONCLUSION_INSTRUCTION` to the three labelled parts (Established, Still open, Next step; use the learner's stated next step) and emit it whenever `turnKind === 'wrap_up'`, independent of message count; update `conclusion-detector.service.spec.ts` accordingly
- [x] 4.2 Keep `conclusionOffered` as an analytics flag only and set it on any wrap-up turn in all three surfaces; verify with queue-service tests that a later ordinary message still gets an ordinary reply ("Dialogue continues after a wrap up")

## 5. Wire the three surfaces

- [x] 5.1 Add `helpControl` (`@IsIn`) to `SendMessageDto` and `DialogueSendMessageDto`; map legacy `wrapUpRequested` to `wrap_up` in the chat controller; verify controller tests for valid control, unknown control → 400 with no enqueue, and legacy flag
- [x] 5.2 Chat (`conversations/services/queue.service.ts`, `openrouter.service.ts`): carry `helpControl` through the job, use `turn.responseFormat` instead of the hard-coded question format; verify queue-service tests for each turn kind
- [x] 5.3 Canvas node dialogue (`dialogue-queue.service.ts`, `dialogue-ai.service.ts`): same wiring; verify `dialogue-queue.service.spec.ts` covers each turn kind
- [x] 5.4 Thought-map node dialogue (`thought-map-dialogue-queue.service.ts`): same wiring; verify its spec covers each turn kind
- [x] 5.5 Confirm help-control turns pass through `AiRequestGate` unchanged; verify a test that a free-tier user over quota gets `RATE_LIMIT_EXCEEDED` for an `explain` send

## 6. Turn budget

- [x] 6.1 Add optional `turnBudget` (1-50, nullable) to `Conversation` and `NodeDialogue` schemas and `defaultTurnBudget` to `UserPreferences`; apply the default at dialogue creation; verify with schema/service tests that old documents load unchanged
- [x] 6.2 Accept `turnBudget` on `PATCH /conversations/:id`, add `PATCH /canvas/:sessionId/nodes/:nodeId/dialogue` and `PATCH /thought-maps/:mapId/nodes/:nodeId/dialogue`, and `defaultTurnBudget` on `PATCH /ai/settings`; verify controller tests including range validation and ownership checks
- [x] 6.3 Read the budget in each queue job and pass `exchangesSoFar`; verify "budget reached", "continuing past the budget" and "budget reached on an Explain turn" with queue-service tests

## 7. Contracts and response DTOs

- [x] 7.1 Extend `StreamEventPayloads.complete` in `mukti-contracts` with `scaffoldLevel`, `turnKind`, `budget`, and make `conclusionReady` apply to all surfaces; emit them from all three queue services; verify `tsc --noEmit` for api and web and the stream tests
- [x] 7.2 Expose `currentScaffoldLevel` and `turnBudget` on conversation and node-dialogue response DTOs and swagger; verify controller response tests

## 8. Web

- [x] 8.1 Build a shared `HelpControls` component (level pill with names from the spec and tooltip descriptions, More help and Explain as next-send toggles, Wrap up button, budget chip with set/clear) with component tests for each state, including "maximum level already active"
- [x] 8.2 Mount it in chat (`conversation-detail.tsx` / `chat-header.tsx`), replacing the 20/30-message wrap-up gate; verify with a component test that Wrap up shows after one assistant reply
- [x] 8.3 Mount it in canvas `node-chat-panel.tsx` and `ThoughtMapDialoguePanel.tsx` and send `helpControl` through `use-dialogue.ts` and `use-thought-map-dialogue.ts`; verify hook tests
- [x] 8.4 Update stream hooks to apply `scaffoldLevel`, `turnKind` and `budget` from `complete` events, and tag Explanation/Summary messages in the message list; verify hook and render tests
- [x] 8.5 Add a "Default turn budget" field to Settings (both modes); verify a settings component test round-trips the value

## 9. Copy and docs

- [ ] 9.1 Update the landing FAQ "Will I ever get a direct answer?", the local onboarding tour and `docs/local-mode.md` to describe the controls factually (no tagline changes); verify by reading the rendered landing and tour in `bun nx run @mukti/web:dev`
- [x] 9.2 Add a "Learner controls" section to RFC-0002 documenting manual raise and the one-turn Explain, and update CLAUDE.md's "never gives direct answers" line to match; verify the docs reference the spec

## 10. Integration checks

- [ ] 10.1 Run `bun run affected:lint`, `bun run affected:test` and `bun run affected:build`; all pass
- [ ] 10.2 Hosted smoke (Docker stack + OpenRouter free model): in chat, a canvas node and a thought-map node, exercise More help, Explain ("just give me the full code"), Wrap up after one reply, and a budget of 3; confirm each spec scenario by observation
- [ ] 10.3 Local smoke with `bun run start:local` on each ready CLI (claude, codex, agy): Explain returns prose not a question and Wrap up returns the three-part summary, including on agy where the shape is enforced

## Workflow follow-up

- Archive the change after review.
- Feed the session-export change (`add-session-export-and-eval-protocol`) the `turnKind` field so study exports record control usage.
