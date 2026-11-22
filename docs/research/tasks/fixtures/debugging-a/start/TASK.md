# Task: fix the word counter

A teammate's `topWords(text, k)` in `word-stats.mjs` returns the `k` most frequent words in a
text. A user reported that the most common word in "The cat and the hat. The end." comes back
as `he`, counted twice, instead of `the`, counted three times.

Find the cause and fix it so `topWords` matches the behaviour described in its comment. Keep the
function's name and signature.

Reproduce the report with:

```sh
node --test
```

This one test is not a full check. When you think you are done, say so and the observer will run
the full acceptance tests. If they do not pass yet you will only hear "not yet", and you may keep
going within the time limit.
