/**
 * The launcher's settings file: `<mukti home>/config.json`.
 *
 * @remarks
 * It holds the provider the user chose, and it is hand-editable, so every way
 * it can be wrong has to leave the launcher able to start. Nothing here may be
 * fatal: the worst outcome is "no default saved", reported with the file named
 * so the user can look.
 */
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import {
  providerSettingsPath,
  readStoredProvider,
  writeStoredProvider,
} from '../provider-settings.ts';

const SUPPORTED = ['claude', 'agy'] as const;

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mukti-settings-test-'));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

function write(contents: unknown): void {
  writeFileSync(
    providerSettingsPath(root),
    typeof contents === 'string' ? contents : JSON.stringify(contents)
  );
}

test('the settings file sits in the Mukti home', () => {
  assert.equal(providerSettingsPath(root), join(root, 'config.json'));
});

test('a missing file means no default, and says nothing', () => {
  const result = readStoredProvider(root, SUPPORTED);

  assert.deepEqual(result, {});
});

test('a valid file yields its provider', () => {
  write({ provider: 'agy', version: 1 });

  assert.deepEqual(readStoredProvider(root, SUPPORTED), { provider: 'agy' });
});

test('malformed JSON means no default, and names the file', () => {
  write('{not json');

  const result = readStoredProvider(root, SUPPORTED);

  assert.equal(result.provider, undefined);
  assert.match(result.warning ?? '', /config\.json/);
});

test('a version this launcher does not know means no default', () => {
  write({ provider: 'agy', version: 99 });

  const result = readStoredProvider(root, SUPPORTED);

  assert.equal(result.provider, undefined);
  assert.match(result.warning ?? '', /config\.json/);
});

test('a provider this launcher does not support means no default', () => {
  write({ provider: 'gemini-cli', version: 1 });

  const result = readStoredProvider(root, SUPPORTED);

  assert.equal(result.provider, undefined);
  assert.match(result.warning ?? '', /gemini-cli/);
});

test('a file with no provider means no default', () => {
  write({ version: 1 });

  assert.deepEqual(readStoredProvider(root, SUPPORTED), {});
});

test('writing records the provider and the format version', () => {
  writeStoredProvider(root, 'agy');

  assert.deepEqual(JSON.parse(readFileSync(providerSettingsPath(root), 'utf8')), {
    provider: 'agy',
    version: 1,
  });
  assert.deepEqual(readStoredProvider(root, SUPPORTED), { provider: 'agy' });
});

test('writing creates the home directory but nothing else', () => {
  const fresh = join(root, 'not-yet');

  writeStoredProvider(fresh, 'claude');

  assert.deepEqual(readdirSync(fresh), ['config.json']);
});

test('writing leaves no temporary file behind', () => {
  writeStoredProvider(root, 'claude');

  assert.deepEqual(readdirSync(root), ['config.json']);
});

test('writing preserves settings this launcher does not know about', () => {
  write({ provider: 'claude', somethingLater: { kept: true }, version: 1 });

  writeStoredProvider(root, 'agy');

  assert.deepEqual(JSON.parse(readFileSync(providerSettingsPath(root), 'utf8')), {
    provider: 'agy',
    somethingLater: { kept: true },
    version: 1,
  });
});

test('writing over a malformed file replaces it rather than failing', () => {
  write('{not json');

  writeStoredProvider(root, 'agy');

  assert.deepEqual(readStoredProvider(root, SUPPORTED), { provider: 'agy' });
});

test('an unreadable settings path is reported, not thrown', () => {
  // A directory where the file should be: readable path, unreadable contents.
  rmSync(providerSettingsPath(root), { force: true });
  const asDirectory = providerSettingsPath(root);
  mkdirSync(asDirectory);

  const result = readStoredProvider(root, SUPPORTED);

  assert.equal(result.provider, undefined);
  assert.match(result.warning ?? '', /config\.json/);
  assert.equal(existsSync(asDirectory), true);
});
