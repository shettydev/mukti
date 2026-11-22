# CS1 B: longest steady river level

Status: **draft for review, not frozen, not ready for participants.** Type: `cs1`. Variant: B.

## Task

- **Participant statement:** [fixtures/cs1-b/start/TASK.md](fixtures/cs1-b/start/TASK.md)
- **Starting code:** `plateau.mjs`, a stub whose comment fully specifies `longestPlateau(levels)`:
  the longest run of equal consecutive values, 1 for a single reading, 0 for none.
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

- **Hidden check:** [fixtures/cs1-b/check/acceptance-test.mjs](fixtures/cs1-b/check/acceptance-test.mjs),
  9 tests. Run with `TASK_DIR=<participant folder> node --test fixtures/cs1-b/check/acceptance-test.mjs`.
- **Correctness key:** [fixtures/cs1-b/key/plateau.mjs](fixtures/cs1-b/key/plateau.mjs). Any
  solution that passes all 9 tests counts.
- **Common mistakes the tests catch:** updating the best run only when a run breaks (misses a
  plateau that reaches the last reading), counting a value that returns later as part of an
  earlier run, and returning 1 for no readings.

## Next-day transfer

- **Statement:** [fixtures/cs1-b/transfer/start/TASK.md](fixtures/cs1-b/transfer/start/TASK.md)
  (longest steady step count). Same run-tracking pattern, but consecutive values only need to be
  within a tolerance, compared by absolute difference.
- **Budget:** 15 minutes, unaided.
- **Hidden check:** [fixtures/cs1-b/transfer/check/acceptance-test.mjs](fixtures/cs1-b/transfer/check/acceptance-test.mjs),
  6 tests. Key: [transfer/key/steady.mjs](fixtures/cs1-b/transfer/key/steady.mjs).

### Transfer anchors

- **0:** no runnable approach, or an approach that does not track consecutive days.
- **1:** a run-tracking approach with two or more failing tests, and the explanation is missing
  or wrong.
- **2:** at most one failing test (typically the final run, the exact-tolerance boundary or a
  falling count), or all tests pass with an incomplete explanation.
- **3:** all tests pass, and the explanation says the best run is updated inside the loop so a
  final run counts, and that the comparison is "at most `tolerance`" on the absolute difference.

## Equivalence with variant A

See [CS1 A](cs1-a.md#equivalence-with-variant-b). Same edge cases and 9 hidden tests. Drafted by
the implementation agent and **not yet reviewed** or timed in a pilot.
