import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test transfer/check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { median } = await import(new URL('median.mjs', dir).href);

test('the reported list', () => {
  assert.equal(median([5, 40, 100, 7]), 23.5);
});

test('an odd count returns the middle value', () => {
  assert.equal(median([120, 15, 9, 300, 42]), 42);
});

test('negative numbers sort below positive ones', () => {
  assert.equal(median([-20, 3, -1]), -1);
});

test('a single value is its own median', () => {
  assert.equal(median([8]), 8);
});

test('an empty list has no median', () => {
  assert.equal(median([]), undefined);
});

test('the input array is not modified', () => {
  const numbers = [30, 4, 200];
  median(numbers);
  assert.deepEqual(numbers, [30, 4, 200]);
});
