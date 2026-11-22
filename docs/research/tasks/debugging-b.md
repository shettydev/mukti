# Debugging B: work queue order

Status: **draft for review, not frozen, not ready for participants.** Type: `debugging`. Variant: B.

## Task

- **Participant statement:** [fixtures/debugging-b/start/TASK.md](fixtures/debugging-b/start/TASK.md)
- **Starting code:** `queue.mjs`. The sort comparator returns a boolean. `true` and `false` become
  1 and 0, never negative, so the sort never moves an item forward and the queue comes back in
  input order.
- **Reproduction:** `node --test` in the participant folder runs `repro-test.mjs` (1 failing test).
- **Size:** one function, about 12 lines. The fix rewrites the comparator to return a number.

## Rules

- **Allowed:** Node 20 or later, a text editor, a terminal and the assigned arm's assistant only.
  No web search, no other AI tool.
- **Budget:** 20 minutes or 12 exchanges, whichever comes first.
- **Stopping rule:** stop when the acceptance tests pass, at the budget, or when the participant
  gives up. The observer runs the hidden check only when asked and answers only "complete" or
  "not yet".

## Acceptance

- **Hidden check:** [fixtures/debugging-b/check/acceptance-test.mjs](fixtures/debugging-b/check/acceptance-test.mjs),
  7 tests. Run with `TASK_DIR=<participant folder> node --test fixtures/debugging-b/check/acceptance-test.mjs`.
- **Correctness key:** [fixtures/debugging-b/key/queue.mjs](fixtures/debugging-b/key/queue.mjs).
  Any comparator that orders by priority (high first) then due date (early first) passes. ISO
  date strings compare correctly as strings, so `localeCompare` or `<` on `due` are both fine.
- On the starting code, 5 of 7 tests fail. The key passes 7 of 7.

## Next-day transfer

- **Statement:** [fixtures/debugging-b/transfer/start/TASK.md](fixtures/debugging-b/transfer/start/TASK.md)
  (median). Same principle in a new setting: `sort()` without a comparator compares values as
  strings, so 100 sorts before 40.
- **Budget:** 15 minutes, unaided.
- **Hidden check:** [fixtures/debugging-b/transfer/check/acceptance-test.mjs](fixtures/debugging-b/transfer/check/acceptance-test.mjs),
  6 tests (3 fail on the starting code). Key: [transfer/key/median.mjs](fixtures/debugging-b/transfer/key/median.mjs).

### Transfer anchors

- **0:** no working change, or a change that alters the median's definition.
- **1:** the reported list is fixed by a special case or partial change, other tests fail, and
  the explanation is missing or wrong.
- **2:** all tests pass but the explanation does not name the cause, or the explanation is right
  and one edge test fails.
- **3:** all tests pass, and the explanation says the default sort compares numbers as text, so
  a numeric comparator such as `(a, b) => a - b` is needed.

## Equivalence with variant A

See [Debugging A](debugging-a.md#equivalence-with-variant-b). Both are single-function defects
with a one-line root cause, a 1-test reproduction and 7 hidden tests. Drafted by the
implementation agent and **not yet reviewed** or timed in a pilot.
