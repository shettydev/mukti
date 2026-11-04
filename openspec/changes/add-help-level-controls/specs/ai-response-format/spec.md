# Spec Delta

## MODIFIED Requirements

### Requirement: Learner-facing and internal surfaces are distinguished

Surfaces whose completions are rendered to the learner as assistant messages — the Socratic
conversation service and the node-dialogue AI service — SHALL declare a shape admitting a single
question and no prose, code, or explanation, except on a turn the learner explicitly requested as
an explanation or as a wrap-up summary, or a turn that reaches a turn budget the learner set. On an
explanation turn the surface SHALL declare the learner-facing explanation shape, and on a wrap-up
turn the learner-facing summary shape, each admitting a single text field and nothing else. Which
shape a learner-facing request declares SHALL be decided only by those learner choices, never by
the help level, the reply content or any other signal.

Surfaces whose completions are consumed by Mukti — thought-map extraction, branch suggestion,
concept extraction, and misconception detection — SHALL declare either their own structure or no
constraint, and SHALL NOT be given any learner-facing shape.

The declaration states what the surface needs, independent of which provider is active. A
consumer SHALL NOT branch on the active provider to decide what to declare.

#### Scenario: a learner-facing completion

- **WHEN** the Socratic conversation service or the node-dialogue AI service requests a completion for an ordinary turn
- **THEN** the request SHALL declare a shape whose only content field is a question

#### Scenario: a learner-requested explanation

- **WHEN** a learner-facing surface requests a completion for a turn the learner marked as Explain
- **THEN** the request SHALL declare the explanation shape, whose only content field is the explanation text
- **AND** the content returned to the surface SHALL be that text, unwrapped

#### Scenario: a learner-requested wrap-up

- **WHEN** a learner-facing surface requests a completion for a turn that is a wrap-up summary
- **THEN** the request SHALL declare the summary shape, whose only content field is the summary text

#### Scenario: the help level alone does not widen the shape

- **WHEN** a learner-facing surface requests a completion for an ordinary turn at help level 4
- **THEN** the request SHALL declare the single-question shape

#### Scenario: an internal analytical completion

- **WHEN** any thought-map, concept-extraction, or misconception-detection service requests a completion
- **THEN** the request SHALL NOT declare any learner-facing shape
- **AND** the response SHALL remain parseable by that service's existing parser
