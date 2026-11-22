import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { longestWarmingStreak } = await import(new URL('streak.mjs', dir).href);

test('the example in the comment', () => {
  assert.equal(longestWarmingStreak([3, 5, 5, 6, 8, 2]), 3);
});

test('no days gives 0', () => {
  assert.equal(longestWarmingStreak([]), 0);
});

test('a single day is a run of 1', () => {
  assert.equal(longestWarmingStreak([12]), 1);
});

test('a streak that reaches the last day is counted', () => {
  assert.equal(longestWarmingStreak([9, 1, 2, 3, 4]), 4);
});

test('equal temperatures break a run', () => {
  assert.equal(longestWarmingStreak([4, 4, 4, 4]), 1);
});

test('steadily cooling days never exceed 1', () => {
  assert.equal(longestWarmingStreak([10, 8, 6, 3]), 1);
});

test('the whole period warming counts every day', () => {
  assert.equal(longestWarmingStreak([1, 2, 3, 4, 5, 6]), 6);
});

test('negative temperatures are compared as numbers', () => {
  assert.equal(longestWarmingStreak([-10, -5, -7, -6, -3, 0, 2]), 5);
});

test('the input array is not modified', () => {
  const temps = [5, 3, 8];
  longestWarmingStreak(temps);
  assert.deepEqual(temps, [5, 3, 8]);
});
