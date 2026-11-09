# Design

## Context

Every Socratic turn goes through `SocraticTurnEngine` (`prepare` → model call → `inspectReply` →
`settle`). It is shared by three surfaces, each with its own queue service, prompt builder and
send-message DTO:

| Surface             | Queue service                         | Prompt builder                                      | DTO                      |
| ------------------- | ------------------------------------- | --------------------------------------------------- | ------------------------ |
| Chat                | `conversations/services/queue.service`| `OpenRouterService.buildPrompt` + `ScaffoldPromptAugmenterService` | `SendMessageDto`         |
| Canvas node chat    | `dialogue/services/dialogue-queue`    | `buildScaffoldAwarePrompt` (`dialogue/utils/prompt-builder.ts`) | `DialogueSendMessageDto` |
| Thought-map node    | `thought-map-dialogue-queue.service`  | `buildThoughtMapSystemPrompt` + `augmentWithScaffoldContext`    | `DialogueSendMessageDto` |

Facts that shape the approach:

- Learner-facing calls declare `SOCRATIC_QUESTION_FORMAT` (`{question}`). OpenRouter declines to
  forward it, Claude Code and Codex ignore it, and Antigravity enforces it with `--json-schema` and
  then unwraps the single field. So on agy today a wrap-up "summary" can only be a question.
- Wrap-up exists only in chat. `ConclusionDetectorService` emits `CONCLUSION_INSTRUCTION` when
  `wrapUpRequested` is set. The web gates the chip at `messageCount >= 20 && conclusionReady` or
  `>= 30`. `conclusionOffered` is set once and then hides the chip forever.
- Scaffold state (`currentScaffoldLevel`, `consecutiveFailures`, `consecutiveSuccesses`) lives on
  `Conversation` and `NodeDialogue` and is written with an optimistic `scaffoldStateGuard`.
- Free-tier quota is enforced in `AiRequestGate` before enqueue, so every send is metered already.
- The level-4 prompt says "always end with a question" and "never provide the full solution".

## Goals / Non-Goals

**Goals:**

- One control field, handled once in the engine, so the three surfaces cannot drift (the reason
  the engine exists).
- Explain is a per-turn override. It never changes stored state except through normal settlement,
  and it never becomes a mode.
- Ship visible state (the level) before more automation.

**Non-Goals:**

- A persistent "direct mode" or a "show solution" button.
- Changing gap-detection weights, the two-success/two-failure thresholds or the BKT model.
- Measuring whether Explain improves learning. That is the comparison study (separate change).
- Hiding the level from the learner. That might help some pedagogy, but this change chooses
  transparency.

## Decisions

### D1. A single `helpControl` enum on the send-message request

`helpControl?: 'more_help' | 'explain' | 'wrap_up'`, validated with `@IsIn`, added to both
`SendMessageDto` and `DialogueSendMessageDto`. `wrapUpRequested: true` maps to `wrap_up` in the chat
controller. If both are sent, `helpControl` wins.

*Alternative:* separate booleans (`moreHelp`, `explain`, `wrapUp`). Rejected because they allow
illegal combinations the engine would have to rank, and the spec says one control per turn.

*Alternative:* slash commands parsed from the message text. Rejected because they are hard to
discover, fragile in other languages, and collide with real content.

### D2. The engine resolves an effective "turn kind"

`PrepareTurnInput` gains `helpControl` and `turnBudget` (with `exchangesSoFar`). `prepare` resolves
one `turnKind: 'ordinary' | 'more_help' | 'explain' | 'wrap_up'`:

1. If a budget is set and this exchange reaches it, the kind is `wrap_up` (budget beats any control).
2. Otherwise the kind is the control, or `ordinary`.

`PreparedTurn` exposes `turnKind` and `responseFormat`, so each surface reads the format from the
engine instead of hard-coding `SOCRATIC_QUESTION_FORMAT`. That keeps the `ai-response-format` rule
"decided only by the learner's choices" in one place and testable.

### D3. More help is a manual escalation inside the existing state machine

Add `ScaffoldFadeService.manualRaise(state)`, a thin wrapper over the existing, currently unused
`forceLevel(state, newLevel, reason)` (which already resets both counters and records a "Manual:"
transition). It calls `forceLevel(state, min(stored + 1, 4), 'learner requested more help')` and
returns it as a `TransitionResult`. In `prepare`, the scaffold context level becomes
`max(gapLevel, stored + 1)`. In `settle`, when the
kind is `more_help`, the manual transition replaces the evaluated one. The user's message is still
evaluated for BKT knowledge updates, because the learner did send content.

*Why replace rather than evaluate and then raise:* evaluation could fade on the same turn and
cancel the request. The learner's explicit ask should win for that turn.

### D4. Explain uses a dedicated instruction and its own format, and stored state stays put

- A new `EXPLAIN_INSTRUCTION` directive (priority above scaffold) tells the model to identify the
  single missing concept or step, explain it in at most about 120 words with at most one short
  example, and stop. No question, no rewritten code, no completed task. It names the
  never-complete-the-solution rule explicitly, because "just give me the code" is a predictable
  input.
- The format is the new `SOCRATIC_EXPLANATION_FORMAT` (`{explanation: string}`).
- The scaffold level for the prompt is the stored level. Explain sits outside the ladder.
- `settle` skips the fade transition (counters unchanged) but still updates BKT for detected
  concepts as "not demonstrated". The learner asking for an explanation is evidence of a gap.
- The quality monitor's "no questions" note is expected on these turns, so the engine passes
  `turnKind` to `inspectReply` to suppress that note.

*Alternative:* treat Explain as a jump to level 4. Rejected because level 4 still ends with a
question and persists, which is exactly the "performing being stuck" problem.

### D5. Wrap-up is moved into the engine for all surfaces and gets its own format

- `ConclusionDetectorService` keeps its heuristic signals (they still drive `conclusionReady`
  hints). The directive is emitted when `turnKind === 'wrap_up'`, with no message-count gate on the
  server path.
- `CONCLUSION_INSTRUCTION` is rewritten to the three labelled parts, **Established**, **Still
  open** and **Next step**, rendered as Markdown headings inside the single `summary` field.
- New `SOCRATIC_SUMMARY_FORMAT` (`{summary: string}`).
- `conclusionOffered` stays a "has ever wrapped up" flag for analytics. The web stops using it to
  hide the control.
- Node dialogues get the same directive through `dialogueQualityService.assess`. They already call
  it via the engine, so only the input wiring changes.

### D6. Turn budget is a dialogue field, with a default from user preferences

- `turnBudget?: number | null` (1 to 50) on `Conversation` and `NodeDialogue`. It is set through
  the existing `PATCH /conversations/:id`, and through a new `PATCH` on each node dialogue
  (`/canvas/:sessionId/nodes/:nodeId/dialogue` and `/thought-maps/:mapId/nodes/:nodeId/dialogue`).
  The budget is read in the queue job, not only at enqueue time, so a change takes effect on the
  next turn.
- `UserPreferences.defaultTurnBudget?: number | null` is read when a dialogue is created. It is
  saved through `PATCH /ai/settings` (it already writes `preferences.activeModel`), with its DTO
  extended. The existing `GET /ai/settings` returns it.
- An "exchange" is one user message with its reply. The count is the number of user messages in
  the dialogue, derived from the existing `messageCount` fields (`Conversation.metadata`,
  `NodeDialogue.messageCount`), so no new counter is needed.
- Past the budget nothing is blocked (spec: shown as exceeded). This matches "bound the
  questioning", not "lock the learner out".

### D7. Contracts and web

- The stream `complete` payload gains `scaffoldLevel` (0 to 4), `turnKind` and
  `budget: { limit, used } | null` for all surfaces. Clients update their caches from the stream
  instead of refetching.
- The response DTOs for conversations and node dialogues expose `currentScaffoldLevel` and
  `turnBudget`.
- A new shared `HelpControls` component (level pill with tooltip descriptions taken from
  `getLevelDescription`, More help, Explain, Wrap up, budget chip) is mounted in the chat header
  area, `node-chat-panel.tsx` and `ThoughtMapDialoguePanel.tsx`. Explain and More help attach to
  the *next* send (a toggle chip on the input), because both need learner content to act on. Wrap
  up sends immediately with a fixed message, as today.
- Explain and summary replies are visually tagged ("Explanation", "Summary") so a learner
  scrolling back can tell them apart from Socratic questions.

### D8. Copy is factual, not positioning

The landing FAQ answer, the onboarding tour and `docs/local-mode.md` describe the controls
accurately ("you can ask it to explain the one piece you're missing; it still won't write the
solution for you"). The "Liberation from AI Dependency" tagline is out of scope and waits for the
study results.

## Risks / Trade-offs

- [Explain leaks a full solution on code tasks] → A strong instruction, plus a post-response check
  that flags Explain replies containing a fenced code block longer than about 8 lines or more than
  about 180 words, with a warning logged. The study's sanitized sessions are the real test.
  Tightening is a prompt change, not a spec change.
- [Learners spam Explain, and Mukti becomes an answer drip] → Each use is visible in the transcript
  and counted (the export change records `turnKind`). The study measures transfer. No rate limit is
  added now, because a limit would bring back the friction this change removes.
- [Codex and Claude ignore the format, and an Explain reply still ends in a question] → The
  instruction says no question, and `inspectReply` logs a violation when an Explain or summary reply
  ends with "?". This is observable in logs and tests with a stub client.
- [agy unwrap expects the `question` field] → Verified not a risk. A probe against the real
  `AntigravityCliAdapter` showed that `{explanation}` and `{summary}` single-field shapes are passed
  through `--json-schema` unchanged, and unwrapped to their text by `parseEnvelope`. Task 1.1 keeps
  this as a permanent test.
- [Concurrent turns while a manual raise is in flight] → The existing `scaffoldStateGuard` filter
  is reused, so a conflicting write fails the same way it does today.
- [Hosted quota burns faster when learners use controls] → This is accepted. Controls are messages.
  The UI does not hide this.

## Migration Plan

All schema fields are optional with defaults, so no data migration is needed. Deploy the API first:
old web clients keep sending `wrapUpRequested`, which still works. Then deploy the web. To roll
back, revert the web, and the API ignores the absent field. The new response formats only take
effect when `helpControl` is sent.

## Open Questions

- The exact Explain word cap (about 120) and leak thresholds. These get tuned from the first study
  sessions without changing the spec.
