import assert from 'node:assert/strict';
import { test } from 'node:test';

import { topWords } from './word-stats.mjs';

test('reported case: the most common word in a short sentence', () => {
  assert.deepEqual(topWords('The cat and the hat. The end.', 1), [['the', 3]]);
});
