# Proposal

## Why

Mukti's adaptive help already works (five levels, two-failure escalation, two-success fading), but
the learner can neither see it nor steer it. A stuck learner has to fail twice to get more help.
There is no way to ask for the one missing piece. Ending a session needs 20+ messages, and canvas
and thought-map node chats can't end at all. The launch-review report
(`MiroFish report_f694a5a46025`) ranked "control over when coaching stops" as the top adoption
blocker. The objection came from students, developers and educators alike. Mukti should give
learners that control without becoming a direct-answer tool.

## What Changes

- **Visible help level.** Every Socratic dialogue (chat, canvas node chat, thought-map node chat)
  shows its current help level, from 0 "Questions only" to 4 "Brief explanations", and the level
  updates after each reply.
- **More help.** Raises the level by one for the next reply straight away. The learner no longer
  has to fail twice first. The two-success fading rule still applies afterwards.
- **Explain (one turn).** The learner asks for the missing piece. The reply explains that one
  concept or step, does not end with a question, and does not complete the learner's task. The
  next reply goes back to the current help level. This is "option (b)": Mukti still never hands
  over the full solution and still has no "just tell me" mode.
- **Wrap up, always available.** Once the dialogue has at least one assistant reply, the learner
  can ask for a closing summary in all three surfaces. Today this needs 20+ messages and exists in
  chat only. The summary has three parts: what was established, what is still open, and the next
  step.
- **Optional turn budget.** The learner can cap a dialogue at N exchanges. When the cap is reached
  the reply is a wrap-up summary. A default budget can be set in Settings. Off by default.
- **Response shapes.** A learner-facing reply is still constrained to a single question, except on
  turns the learner explicitly asked for as an explanation or a wrap-up. Those turns declare their
  own single-field text shapes. This also fixes wrap-up on providers that enforce shapes
  (Antigravity), where today a summary can only come back as a question.
- **Same in hosted and local mode.** Each control is an ordinary model call. In hosted mode
  without a user's own OpenRouter key, it counts against the free daily quota like any message.
- **Copy accuracy.** The landing FAQ ("Will I ever get a direct answer?"), the local onboarding
  tour and the docs describe the new controls. This is a factual update, not the positioning
  rewrite, which waits for the comparison study.
- The `wrapUpRequested` field on the chat send-message request stays as a deprecated alias for
  the new control field.

## Capabilities

### New Capabilities

- `dialogue-help-controls`: lets the learner see and steer Socratic help in every dialogue surface:
  the help-level indicator, More help, the one-turn Explain, wrap-up and the turn budget.

### Modified Capabilities

- `ai-response-format`: the "Learner-facing and internal surfaces are distinguished" requirement
  now allows explanation and summary shapes on learner-requested turns, in addition to the
  single-question shape.

## Impact

- **API** (`packages/mukti-api`): `SocraticTurnEngine` (new help-control input), `ScaffoldFadeService`
  (manual raise), `ConclusionDetectorService` (gate removed from the server path; new summary
  structure), prompt builders and `ScaffoldPromptAugmenterService` (explanation instruction), the
  three queue services (chat, canvas dialogue, thought-map dialogue), the send-message DTOs for
  conversations and node dialogues, the response DTOs, and the `Conversation` and `NodeDialogue`
  schemas (turn budget).
- **AI response formats**: two new learner-facing formats beside `SOCRATIC_QUESTION_FORMAT`. The
  Antigravity adapter's single-field unwrap already handles them.
- **Contracts** (`packages/mukti-contracts`): the stream `complete` payload gains the help level
  for every surface, and `conclusionReady` is no longer chat-only.
- **Web** (`packages/mukti-web`): the chat header (`conversation-detail.tsx`, `chat-header.tsx`),
  the canvas `node-chat-panel.tsx`, the `ThoughtMapDialoguePanel.tsx`, a shared help-controls
  component, Settings (default turn budget), the stream hooks, the landing FAQ and the onboarding
  tour.
- **User preferences**: a new optional `defaultTurnBudget`.
- **Docs**: an RFC-0002 note on manual raise and Explain, plus the docs that describe Socratic
  behaviour.
- No new dependencies. Existing documents work unchanged because the new fields are optional with
  defaults.
