# CS1 A: longest warming streak

Status: **draft for review, not frozen, not ready for participants.** Type: `cs1`. Variant: A.

## Task

- **Participant statement:** [fixtures/cs1-a/start/TASK.md](fixtures/cs1-a/start/TASK.md)
- **Starting code:** `streak.mjs`, a stub whose comment fully specifies `longestWarmingStreak(temps)`:
  the longest run of strictly increasing consecutive values, 1 for a single day, 0 for none.
- **Visible example:** `node --test` in the participant folder runs `example-test.mjs` (1 test).
- **Size:** about 10 lines in a reference solution. One loop with a current run and a best run.

## Rules

- **Allowed:** Node 20 or later, a text editor, a terminal and the assigned arm's assistant only.
  No web search, no other AI tool.
- **Budget:** 20 minutes or 12 exchanges, whichever comes first.
- **Stopping rule:** stop when the acceptance tests pass, at the budget, or when the participant
  gives up. The observer runs the hidden check only when asked and answers only "complete" or
  "not yet".

## Acceptance

- **Hidden check:** [fixtures/cs1-a/check/acceptance-test.mjs](fixtures/cs1-a/check/acceptance-test.mjs),
  9 tests. Run with `TASK_DIR=<participant folder> node --test fixtures/cs1-a/check/acceptance-test.mjs`.
- **Correctness key:** [fixtures/cs1-a/key/streak.mjs](fixtures/cs1-a/key/streak.mjs). Any
  solution that passes all 9 tests counts.
- **Common mistakes the tests catch:** updating the best run only when a run breaks (misses a
  streak that reaches the last day), treating equal days as warming, and returning 1 for no days.

## Next-day transfer

- **Statement:** [fixtures/cs1-a/transfer/start/TASK.md](fixtures/cs1-a/transfer/start/TASK.md)
  (longest high heart-rate stretch). Same run-tracking pattern, but the condition is a threshold
  and a run can be 0 long.
- **Budget:** 15 minutes, unaided.
- **Hidden check:** [fixtures/cs1-a/transfer/check/acceptance-test.mjs](fixtures/cs1-a/transfer/check/acceptance-test.mjs),
  6 tests. Key: [transfer/key/stretch.mjs](fixtures/cs1-a/transfer/key/stretch.mjs).

### Transfer anchors

- **0:** no runnable approach, or an approach that does not track consecutive readings.
- **1:** a run-tracking approach with two or more failing tests, and the explanation is missing
  or wrong.
- **2:** at most one failing test (typically the final stretch or threshold equality), or all
  tests pass with an incomplete explanation.
- **3:** all tests pass, and the explanation says the best run is updated inside the loop so a
  final stretch counts, and that the answer stays 0 when no reading qualifies.

## Equivalence with variant B

Both implement a "longest consecutive run" from a fully specified comment with the same edge
cases (empty, single, run reaching the end, negatives, no mutation) and 9 hidden tests. A uses
"strictly greater than the previous" and B uses "equal to the previous". Drafted by the
implementation agent and **not yet reviewed** or timed in a pilot.
