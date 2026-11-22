import assert from 'node:assert/strict';
import { test } from 'node:test';

import { longestWarmingStreak } from './streak.mjs';

test('the example in the comment', () => {
  assert.equal(longestWarmingStreak([3, 5, 5, 6, 8, 2]), 3);
});
