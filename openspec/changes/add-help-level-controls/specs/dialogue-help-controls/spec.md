# Spec Delta

## Purpose

Lets the learner see and steer the Socratic help Mukti gives in every dialogue surface. They can
see the current help level, ask for more help, ask once for the missing piece, wrap up, and cap the
session length, without Mukti ever handing over the complete solution.

## ADDED Requirements

### Requirement: Help controls cover every Socratic dialogue surface

The help-level indicator, More help, Explain, Wrap up and the turn budget SHALL be available in the
Socratic conversation, the canvas node dialogue and the thought-map node dialogue. They SHALL behave
the same in hosted mode and in local mode, and the same whichever AI provider is active.

#### Scenario: controls in a canvas node dialogue

- **WHEN** a learner opens a canvas node dialogue that has at least one assistant reply
- **THEN** the help-level indicator, More help, Explain and Wrap up are shown

#### Scenario: controls in hosted mode

- **WHEN** a hosted-mode learner without their own OpenRouter key uses More help
- **THEN** the request is accepted and served like any other message

### Requirement: Current help level is visible

Each dialogue SHALL show its current help level as a number from 0 to 4 with a short name (0
"Questions only", 1 "Thinking prompts", 2 "Hints", 3 "Examples", 4 "Brief explanations"). The
indicator SHALL update after every assistant reply to the level that reply's settlement produced.

#### Scenario: level rises after two struggles

- **WHEN** the learner's last two replies are judged as not demonstrating understanding and the level was 1
- **THEN** after the next assistant reply the indicator shows level 2 "Hints"

#### Scenario: level of a new dialogue

- **WHEN** a dialogue has had no exchanges yet
- **THEN** the indicator shows the level the dialogue starts at

### Requirement: More help raises the level immediately

When the learner chooses More help, the next assistant reply SHALL be written one level higher than
the level stored before that turn (capped at 4). No consecutive failures SHALL be needed first, and
the raised level SHALL persist. The two-success fading rule SHALL apply afterwards as usual.

#### Scenario: More help from level 1

- **WHEN** the stored level is 1 and the learner sends a message with More help
- **THEN** the reply is written at level 2
- **AND** the stored level becomes 2 with both consecutive counters reset to 0

#### Scenario: More help at the top level

- **WHEN** the stored level is 4 and the learner chooses More help
- **THEN** the reply is written at level 4
- **AND** the control indicates that the maximum level is already active

#### Scenario: fading still applies

- **WHEN** after More help the learner gives two consecutive replies that demonstrate understanding
- **THEN** the level fades by one as it would after an automatic escalation

### Requirement: Explain gives the missing piece for one turn

When the learner chooses Explain, the next reply SHALL explain the single concept or step the
learner is missing, in plain prose, and SHALL NOT end with a question. It SHALL NOT complete the
learner's task or solution. The following reply SHALL return to the stored help level.

#### Scenario: Explain on a debugging question

- **WHEN** a learner working through a failing retry handler chooses Explain
- **THEN** the reply explains the missing concept (for example, idempotency) with at most one short example
- **AND** the reply does not contain a corrected version of the learner's handler
- **AND** the reply does not end with a question

#### Scenario: next turn returns to the stored level

- **WHEN** the learner sends an ordinary message after an Explain reply
- **THEN** that reply is written at the stored help level, under the normal question-shaped constraint

#### Scenario: Explain does not count as a failure

- **WHEN** the learner chooses Explain
- **THEN** that turn does not change the consecutive success or failure counters

### Requirement: Explain has no full-solution escape

No control, phrase or setting SHALL make Mukti produce the complete final solution to the
learner's problem. Explain SHALL remain limited to one missing piece per request.

#### Scenario: learner asks Explain for the whole answer

- **WHEN** the learner chooses Explain with the message "just give me the full code"
- **THEN** the reply explains the missing concept or step only
- **AND** the reply does not contain a complete solution

### Requirement: Wrap up is available once the dialogue has a reply

Wrap up SHALL be available in every surface as soon as the dialogue has at least one assistant
reply, with no minimum message count. Choosing it SHALL produce a closing summary that does not end
with a probing question.

#### Scenario: early wrap up in chat

- **WHEN** a conversation has 4 messages and the learner chooses Wrap up
- **THEN** a closing summary is returned

#### Scenario: wrap up in a thought-map node dialogue

- **WHEN** a thought-map node dialogue has one assistant reply and the learner chooses Wrap up
- **THEN** a closing summary is returned for that node's dialogue

### Requirement: Wrap-up summary states what is settled and open

A wrap-up summary SHALL contain three labelled parts: what was established in the dialogue, what is
still open or uncertain, and the learner's next step. When the learner stated a next step, the
summary SHALL use it.

#### Scenario: summary structure

- **WHEN** a wrap-up summary is produced
- **THEN** it contains an "Established" part, an "Still open" part and a "Next step" part

### Requirement: Dialogue continues after a wrap up

After a wrap-up summary, the learner SHALL be able to keep sending messages in the same dialogue.
Wrap up SHALL remain available.

#### Scenario: continuing after wrap up

- **WHEN** the learner sends a message after a wrap-up summary
- **THEN** the dialogue continues with an ordinary reply at the stored help level

### Requirement: Optional turn budget ends with a summary

A learner SHALL be able to set a turn budget (1 to 50 exchanges) on a dialogue, and SHALL be able to
clear it. When the exchange that reaches the budget is sent, its reply SHALL be a wrap-up summary.
The remaining budget SHALL be shown. No budget SHALL be set by default.

#### Scenario: budget reached

- **WHEN** a dialogue has a budget of 5 and the learner sends the fifth exchange
- **THEN** the reply is a wrap-up summary
- **AND** the indicator shows the budget as used

#### Scenario: continuing past the budget

- **WHEN** the budget is used and the learner sends another message
- **THEN** the dialogue continues with an ordinary reply
- **AND** the budget is shown as exceeded rather than blocking the message

#### Scenario: default budget from Settings

- **WHEN** the learner has set a default turn budget of 10 in Settings and creates a new dialogue
- **THEN** the new dialogue starts with a budget of 10

### Requirement: Each turn carries at most one help control

A message SHALL carry at most one of More help, Explain or Wrap up. A request carrying an unknown
control SHALL be rejected with a validation error. When the turn budget is reached on a More help
or Explain turn, Wrap up SHALL take precedence.

#### Scenario: unknown control

- **WHEN** a send-message request names a help control the API does not recognise
- **THEN** the API responds with a validation error and no model call is made

#### Scenario: budget reached on an Explain turn

- **WHEN** the turn that reaches the budget carries Explain
- **THEN** the reply is a wrap-up summary

### Requirement: Help controls are billed like ordinary messages

Each help-control turn SHALL be one model call. In hosted mode without the learner's own key it
SHALL count against the free daily quota exactly like an ordinary message. In local mode it SHALL use
the active CLI like any other turn.

#### Scenario: free quota exhausted

- **WHEN** a hosted-mode learner without their own key has used the daily free quota and chooses Explain
- **THEN** the request is refused with the same rate-limit error an ordinary message receives

### Requirement: Legacy wrap-up flag remains accepted

The chat send-message request SHALL keep accepting `wrapUpRequested: true` and SHALL treat it as a
Wrap up control.

#### Scenario: old client sends wrapUpRequested

- **WHEN** a client sends a chat message with `wrapUpRequested: true` and no help control
- **THEN** the reply is a wrap-up summary
