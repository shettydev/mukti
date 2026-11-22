import assert from 'node:assert/strict';
import { test } from 'node:test';

import { longestPlateau } from './plateau.mjs';

test('the example in the comment', () => {
  assert.equal(longestPlateau([4, 7, 7, 7, 2, 2]), 3);
});
