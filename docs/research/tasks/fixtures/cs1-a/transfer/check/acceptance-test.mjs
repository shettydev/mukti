import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test transfer/check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { longestHighStretch } = await import(new URL('stretch.mjs', dir).href);

test('the example in the comment', () => {
  assert.equal(longestHighStretch([90, 130, 140, 100, 150, 155, 160], 120), 3);
});

test('no reading meets the threshold', () => {
  assert.equal(longestHighStretch([60, 70, 80], 120), 0);
});

test('no readings gives 0', () => {
  assert.equal(longestHighStretch([], 100), 0);
});

test('a reading equal to the threshold counts', () => {
  assert.equal(longestHighStretch([119, 120, 120, 90], 120), 2);
});

test('a stretch that reaches the last reading is counted', () => {
  assert.equal(longestHighStretch([130, 80, 125, 126, 127, 128], 120), 4);
});

test('every reading high counts every reading', () => {
  assert.equal(longestHighStretch([140, 141, 142], 100), 3);
});
