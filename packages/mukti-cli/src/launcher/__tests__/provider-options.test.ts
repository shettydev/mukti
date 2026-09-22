/**
 * The provider flags both launchers accept.
 *
 * @remarks
 * Parsed in one place so `npx muktiai` and `start:local` cannot drift, and
 * validated rather than resolved by precedence: naming a provider *and* asking
 * to choose one is a contradiction, and guessing which the user meant would be
 * worse than saying so.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseProviderOptions } from '../provider-options.ts';

test('no flags means nothing chosen, nothing saved', () => {
  const result = parseProviderOptions([]);

  assert.deepEqual(result, {
    kind: 'ok',
    options: { choose: false, provider: undefined, save: false },
    rest: [],
  });
});

test('a provider can be named, with or without saving it', () => {
  assert.deepEqual(parseProviderOptions(['--provider', 'agy']), {
    kind: 'ok',
    options: { choose: false, provider: 'agy', save: false },
    rest: [],
  });
  assert.deepEqual(parseProviderOptions(['--provider', 'agy', '--save']), {
    kind: 'ok',
    options: { choose: false, provider: 'agy', save: true },
    rest: [],
  });
});

test('choosing again is a flag of its own', () => {
  assert.deepEqual(parseProviderOptions(['--choose']), {
    kind: 'ok',
    options: { choose: true, provider: undefined, save: false },
    rest: [],
  });
});

test('arguments the launcher owns are handed back untouched', () => {
  const result = parseProviderOptions(['--port', '4000', '--choose', '--data-dir', '/tmp/x']);

  assert.equal(result.kind === 'ok' && result.options.choose, true);
  assert.deepEqual(result.kind === 'ok' ? result.rest : null, [
    '--port',
    '4000',
    '--data-dir',
    '/tmp/x',
  ]);
});

test('--provider needs a value', () => {
  const result = parseProviderOptions(['--provider']);

  assert.equal(result.kind, 'error');
  assert.match(result.kind === 'error' ? result.message : '', /--provider needs a value/);
});

test('--provider does not swallow the next flag as its value', () => {
  const result = parseProviderOptions(['--provider', '--choose']);

  assert.equal(result.kind, 'error');
  assert.match(result.kind === 'error' ? result.message : '', /--provider needs a value/);
});

test('saving without naming a provider is refused', () => {
  const result = parseProviderOptions(['--save']);

  assert.equal(result.kind, 'error');
  assert.match(result.kind === 'error' ? result.message : '', /--save/);
  assert.match(result.kind === 'error' ? result.message : '', /--provider/);
});

test('naming a provider and asking to choose one is refused', () => {
  const result = parseProviderOptions(['--provider', 'agy', '--choose']);

  assert.equal(result.kind, 'error');
  assert.match(result.kind === 'error' ? result.message : '', /--choose/);
});
