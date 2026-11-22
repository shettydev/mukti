# Design review A: profile cache

Status: **draft for review, not frozen, not ready for participants.** Type: `design-review`.
Variant: A.

## Task

- **Participant statement:** [fixtures/design-review-a/start/TASK.md](fixtures/design-review-a/start/TASK.md)
- **Code under review:** [profile-cache.mjs](fixtures/design-review-a/start/profile-cache.mjs),
  17 lines. An in-memory profile cache shared by every request. Nothing needs to run.
- **Output:** a short written review: each problem, when it happens, the fix, ranked by severity.

## Rules

- **Allowed:** a text editor and the assigned arm's assistant only. No web search, no other AI tool.
- **Budget:** 20 minutes or 12 exchanges, whichever comes first.
- **Stopping rule:** stop when the review is complete, at the budget, or when the participant
  gives up. The observer checks against the key only when asked and answers only "complete" or
  "not yet".

## Acceptance

The review is **complete** when it names at least 3 of the 4 core issues, includes issue 1, and
gives each named issue a concrete consequence and a workable fix.

| #   | Core issue                                                                                     | Fix                                          |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | SQL injection: `userId` is interpolated into the query.                                        | Parameterised query.                         |
| 2   | Stale data: `updateProfile` never invalidates the cache, so users keep seeing the old profile. | Delete or refresh the cache entry on update. |
| 3   | Unbounded growth: entries are never evicted, so memory grows with every user ever seen.        | Size limit or LRU, and a TTL.                |
| 4   | Plain-object keys: a `userId` like `__proto__` or `constructor` reads built-in properties.     | Use a `Map`, or validate `userId`.           |

Also credited but not required: per-process caches disagree across servers, cached objects are
returned by reference so callers can mutate them, and a falsy cached value is never treated as a hit.

## Next-day transfer

- **Statement:** [fixtures/design-review-a/transfer/start/TASK.md](fixtures/design-review-a/transfer/start/TASK.md)
  (search cache). Same principles: injection, a cache key that ignores part of the input (the
  search term), and unbounded shared state.
- **Budget:** 15 minutes, unaided. Scored with the anchors below, no automated check.
- **Key:** SQL injection through `term` in the `LIKE` clause. The cache is keyed only by
  `userId`, so a user's second search returns their first search's results. Entries never expire.
  Plain-object keys as in the task.

### Transfer anchors

- **0:** no issue identified with a concrete consequence, or a harmful fix (for example escaping
  quotes by hand as the only injection defence).
- **1:** one issue with a concrete consequence, or several named vaguely with no fixes.
- **2:** the injection and the wrong cache key, each with a consequence, with a gap in fixes or
  ranking.
- **3:** the injection and the wrong cache key ranked at the top with concrete fixes (parameterised
  query, key by user and term or skip the cache when the term changes), plus at least one more issue.

## Equivalence with variant B

Both are short server snippets with four core issues, the most severe being SQL injection in
each. A's second issue is cache invalidation and B's is missing authorisation. Drafted by the
implementation agent and **not yet reviewed** or timed in a pilot. A reviewer should check that
neither snippet's issues are noticeably easier to spot.
