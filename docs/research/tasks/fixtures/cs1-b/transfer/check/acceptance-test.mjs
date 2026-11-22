import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test transfer/check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { longestSteadyRun } = await import(new URL('steady.mjs', dir).href);

test('the example in the comment', () => {
  assert.equal(longestSteadyRun([5000, 5200, 5100, 9000, 9050], 300), 3);
});

test('no days gives 0', () => {
  assert.equal(longestSteadyRun([], 100), 0);
});

test('a single day is a run of 1', () => {
  assert.equal(longestSteadyRun([4000], 100), 1);
});

test('a change of exactly the tolerance keeps the run going', () => {
  assert.equal(longestSteadyRun([1000, 1100, 1200], 100), 3);
});

test('a run that reaches the last day is counted', () => {
  assert.equal(longestSteadyRun([100, 900, 905, 910, 915], 10), 4);
});

test('falling counts are compared by absolute difference', () => {
  assert.equal(longestSteadyRun([8000, 7900, 7850, 3000], 100), 3);
});
