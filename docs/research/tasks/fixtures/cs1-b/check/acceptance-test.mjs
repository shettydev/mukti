import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { longestPlateau } = await import(new URL('plateau.mjs', dir).href);

test('the example in the comment', () => {
  assert.equal(longestPlateau([4, 7, 7, 7, 2, 2]), 3);
});

test('no readings gives 0', () => {
  assert.equal(longestPlateau([]), 0);
});

test('a single reading is a run of 1', () => {
  assert.equal(longestPlateau([30]), 1);
});

test('a plateau that reaches the last reading is counted', () => {
  assert.equal(longestPlateau([1, 9, 9, 9, 9]), 4);
});

test('every reading different never exceeds 1', () => {
  assert.equal(longestPlateau([1, 2, 3, 2, 1]), 1);
});

test('every reading equal counts every reading', () => {
  assert.equal(longestPlateau([6, 6, 6, 6, 6]), 5);
});

test('a value that returns later starts a new run', () => {
  assert.equal(longestPlateau([5, 5, 2, 5, 5, 5]), 3);
});

test('negative readings are compared as numbers', () => {
  assert.equal(longestPlateau([-3, -3, -1, -1, -1, 0]), 3);
});

test('the input array is not modified', () => {
  const levels = [2, 2, 8];
  longestPlateau(levels);
  assert.deepEqual(levels, [2, 2, 8]);
});
