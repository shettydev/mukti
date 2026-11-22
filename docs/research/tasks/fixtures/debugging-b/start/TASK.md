# Task: fix the work queue order

A teammate's `orderQueue(tasks)` in `queue.mjs` should put the highest-priority tasks first, and
among equal priorities the one due soonest. A user reported that the queue comes back in the
order the tasks were entered, so urgent work is not moved to the front.

Find the cause and fix it so `orderQueue` matches the behaviour described in its comment. Keep
the function's name and signature.

Reproduce the report with:

```sh
node --test
```

This one test is not a full check. When you think you are done, say so and the observer will run
the full acceptance tests. If they do not pass yet you will only hear "not yet", and you may keep
going within the time limit.
