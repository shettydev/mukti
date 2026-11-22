# Debugging A: word counter

Status: **draft for review, not frozen, not ready for participants.** Type: `debugging`. Variant: A.

## Task

- **Participant statement:** [fixtures/debugging-a/start/TASK.md](fixtures/debugging-a/start/TASK.md)
- **Starting code:** `word-stats.mjs`. `topWords(text, k)` splits on `/[^a-z]+/` _before_
  lowercasing, so every capital letter acts as a separator. "The" becomes "he".
- **Reproduction:** `node --test` in the participant folder runs `repro-test.mjs` (1 failing test).
- **Size:** one function, about 28 lines. The fix is one line: lowercase before splitting.

## Rules

- **Allowed:** Node 20 or later, a text editor, a terminal and the assigned arm's assistant only.
  No web search, no other AI tool.
- **Budget:** 20 minutes or 12 exchanges, whichever comes first.
- **Stopping rule:** stop when the acceptance tests pass, at the budget, or when the participant
  gives up. The observer runs the hidden check only when asked and answers only "complete" or
  "not yet".

## Acceptance

- **Hidden check:** [fixtures/debugging-a/check/acceptance-test.mjs](fixtures/debugging-a/check/acceptance-test.mjs),
  7 tests. Run with `TASK_DIR=<participant folder> node --test fixtures/debugging-a/check/acceptance-test.mjs`.
- **Correctness key:** [fixtures/debugging-a/key/word-stats.mjs](fixtures/debugging-a/key/word-stats.mjs).
  Any solution that passes all 7 tests counts. Changing the regex to `/[^a-zA-Z]+/` also passes
  and is acceptable.
- On the starting code, 3 of 7 tests fail. The key passes 7 of 7.

## Next-day transfer

- **Statement:** [fixtures/debugging-a/transfer/start/TASK.md](fixtures/debugging-a/transfer/start/TASK.md)
  (hashtag extractor). Same principle in a new setting: the pattern only matches lowercase, so
  capitalised tags are cut short or skipped.
- **Budget:** 15 minutes, unaided.
- **Hidden check:** [fixtures/debugging-a/transfer/check/acceptance-test.mjs](fixtures/debugging-a/transfer/check/acceptance-test.mjs),
  6 tests (2 fail on the starting code). Key: [transfer/key/hashtags.mjs](fixtures/debugging-a/transfer/key/hashtags.mjs).

### Transfer anchors

- **0:** no working change, or a change that drops the lowercase output or the de-duplication.
- **1:** the reported post is fixed but other tests fail, and the explanation is missing or wrong.
- **2:** all tests pass but the explanation does not name the cause, or the explanation is right
  and one edge test fails.
- **3:** all tests pass, and the explanation says the pattern only matched lowercase letters, so
  case has to be normalised before matching (or the match made case-insensitive).

## Equivalence with variant B

Both are single-function defects with a one-line root cause hidden behind a misleading symptom,
a 1-test reproduction and 7 hidden tests. A is a "normalise before you match" error and B is a
"comparator must return a number" error. Drafted by the implementation agent and **not yet
reviewed** by an independent reviewer or timed in a pilot.
