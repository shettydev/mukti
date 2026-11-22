import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { topWords } = await import(new URL('word-stats.mjs', dir).href);

test('the reported sentence', () => {
  assert.deepEqual(topWords('The cat and the hat. The end.', 1), [['the', 3]]);
});

test('words are compared ignoring case and returned in lowercase', () => {
  assert.deepEqual(topWords('Apple apple APPLE pie', 2), [
    ['apple', 3],
    ['pie', 1],
  ]);
});

test('a capital letter in the middle of a word does not split it', () => {
  assert.deepEqual(topWords('JavaScript javascript', 5), [['javascript', 2]]);
});

test('ties are broken alphabetically', () => {
  assert.deepEqual(topWords('b a b a c', 2), [
    ['a', 2],
    ['b', 2],
  ]);
});

test('digits and punctuation separate words', () => {
  assert.deepEqual(topWords("x1x, 2y! don't", 10), [
    ['x', 2],
    ['don', 1],
    ['t', 1],
    ['y', 1],
  ]);
});

test('k larger than the number of words returns every word', () => {
  assert.deepEqual(topWords('one two', 5), [
    ['one', 1],
    ['two', 1],
  ]);
});

test('empty text and k = 0 return no words', () => {
  assert.deepEqual(topWords('', 3), []);
  assert.deepEqual(topWords('Some words here', 0), []);
});
