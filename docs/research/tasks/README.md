# Task set

**Status: drafts for review, not frozen, not ready for participants.** Each variant has a
statement, starting code, a hidden acceptance check, a reference key and a next-day transfer
task with scoring anchors. None has been independently reviewed for difficulty equivalence or
timed in a pilot. Freeze them only after that review, and record the frozen commit. Use the
assignment constraints in [the protocol](../eval-protocol.md). Never reuse a variant for a
participant.

| Type          | Variant A                              | Variant B                                 |
| ------------- | -------------------------------------- | ----------------------------------------- |
| debugging     | [A: word counter](debugging-a.md)      | [B: work queue order](debugging-b.md)     |
| design-review | [A: profile cache](design-review-a.md) | [B: order export](design-review-b.md)     |
| cs1           | [A: longest warming streak](cs1-a.md)  | [B: longest steady river level](cs1-b.md) |

## Fixture layout

Each variant has a folder under [fixtures/](fixtures/):

- `start/` is the only folder a participant receives: `TASK.md`, the starting code and, for coding
  tasks, one visible test. Copy it to a fresh folder per session.
- `check/acceptance-test.mjs` is the hidden acceptance check. The observer runs it against the
  participant's folder:
  `TASK_DIR=<participant folder> node --test docs/research/tasks/fixtures/<variant>/check/acceptance-test.mjs`
- `key/` is the reference solution. Do not show it to participants.
- `transfer/` holds the next-day task in the same layout (`start/`, `check/`, `key/`). The design
  review transfers are scored with the anchors in the task file only.

Fixtures need Node 20 or later and no dependencies. Test files are named `*-test.mjs` so
`node --test` finds them and the repository's `bun test` does not, because the starting code is
meant to fail.

## Self-check

Before freezing, confirm that every starting folder fails its acceptance check and every key passes:

```sh
cd docs/research/tasks/fixtures
for t in debugging-a debugging-b cs1-a cs1-b \
  debugging-a/transfer debugging-b/transfer cs1-a/transfer cs1-b/transfer; do
  TASK_DIR=$t/start node --test $t/check/acceptance-test.mjs >/dev/null 2>&1 && echo "$t: start PASSES (wrong)"
  TASK_DIR=$t/key node --test $t/check/acceptance-test.mjs >/dev/null 2>&1 || echo "$t: key FAILS (wrong)"
done
```

No output means the fixtures are consistent.
