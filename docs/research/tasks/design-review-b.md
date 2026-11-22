# Design review B: order export

Status: **draft for review, not frozen, not ready for participants.** Type: `design-review`.
Variant: B.

## Task

- **Participant statement:** [fixtures/design-review-b/start/TASK.md](fixtures/design-review-b/start/TASK.md)
- **Code under review:** [order-export.mjs](fixtures/design-review-b/start/order-export.mjs),
  13 lines. A CSV export of a user's orders, fed straight from the request's query parameters.
  Nothing needs to run.
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

| #   | Core issue                                                                                                                   | Fix                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | SQL injection: `userId` and `from` are interpolated into the query.                                                          | Parameterised query, and validate `from` as a date.                 |
| 2   | Missing authorisation: `userId` comes from the URL, so anyone can export another user's orders.                              | Take the user from the authenticated session, not the query.        |
| 3   | Broken CSV: an item containing a comma, quote or newline shifts columns; `=` at the start runs as a formula in spreadsheets. | Quote and escape fields, and neutralise leading `=`, `+`, `-`, `@`. |
| 4   | Unbounded export: the whole history is loaded and concatenated in memory with no limit.                                      | Limit or paginate, or stream rows.                                  |

Also credited but not required: `SELECT *` exposes unneeded columns, and there is no handling of
an empty or failed query.

## Next-day transfer

- **Statement:** [fixtures/design-review-b/transfer/start/TASK.md](fixtures/design-review-b/transfer/start/TASK.md)
  (receipt email). Same principles: injection, missing authorisation and unescaped output.
- **Budget:** 15 minutes, unaided. Scored with the anchors below, no automated check.
- **Key:** SQL injection through `orderId`. Any caller can send any order's receipt to any
  address in `body.email`, leaking another customer's order. `customerName` and `note` are put
  into HTML unescaped. A missing order crashes on `order.customerName`.

### Transfer anchors

- **0:** no issue identified with a concrete consequence, or a harmful fix (for example escaping
  quotes by hand as the only injection defence).
- **1:** one issue with a concrete consequence, or several named vaguely with no fixes.
- **2:** the injection and the missing authorisation, each with a consequence, with a gap in fixes
  or ranking.
- **3:** the injection and the missing authorisation ranked at the top with concrete fixes
  (parameterised query, check the order belongs to the session user and send only to their stored
  address), plus at least one more issue.

## Equivalence with variant A

See [Design review A](design-review-a.md#equivalence-with-variant-b). Drafted by the
implementation agent and **not yet reviewed** or timed in a pilot.
