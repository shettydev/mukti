# Transfer task: fix the hashtag extractor

Work alone. Do not use AI, search, notes or your earlier session.

`hashtags(post)` in `hashtags.mjs` should return every distinct hashtag in a post. A user
reported that "Morning #Coffee, then #tea" returns `["tea"]` instead of `["coffee", "tea"]`, and
that "#JavaScript is fun" returns `[]`.

Fix it so `hashtags` matches its comment. Then write two or three sentences explaining the cause
and why your fix works.
