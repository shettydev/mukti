import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

// Observer runs: TASK_DIR=<participant folder> node --test transfer/check/acceptance-test.mjs
const dir = process.env.TASK_DIR
  ? pathToFileURL(resolve(process.env.TASK_DIR) + '/')
  : new URL('../start/', import.meta.url);
const { hashtags } = await import(new URL('hashtags.mjs', dir).href);

test('the reported post', () => {
  assert.deepEqual(hashtags('Morning #Coffee, then #tea'), ['coffee', 'tea']);
});

test('a tag that only appears capitalised is found', () => {
  assert.deepEqual(hashtags('#JavaScript is fun'), ['javascript']);
});

test('the same tag in different case is listed once', () => {
  assert.deepEqual(hashtags('Loving #JavaScript and #javascript today'), ['javascript']);
});

test('first appearance decides the order', () => {
  assert.deepEqual(hashtags('#b #A #b #a #c'), ['b', 'a', 'c']);
});

test('a tag ends at the first character that is not a letter', () => {
  assert.deepEqual(hashtags('#web3 #x-y'), ['web', 'x']);
});

test('no tags gives an empty list', () => {
  assert.deepEqual(hashtags('no tags # here'), []);
});
