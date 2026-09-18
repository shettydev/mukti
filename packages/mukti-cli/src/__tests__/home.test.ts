/**
 * Where the launcher keeps its state, and what resolving that path is allowed
 * to do.
 *
 * @remarks
 * The saved provider default lives in this directory, and it is read on every
 * launch — including launches that never touch the database. Resolving the path
 * must therefore create nothing on its own; only `resolveMuktiHome`, which the
 * database and logs go through, creates directories.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { MUKTI_HOME_ENV, resolveMuktiHome, resolveMuktiRoot } from '../home.ts';

const ORIGINAL = process.env[MUKTI_HOME_ENV];
let sandbox: string;

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'mukti-home-test-'));
  delete process.env[MUKTI_HOME_ENV];
});

afterEach(() => {
  rmSync(sandbox, { force: true, recursive: true });
  if (ORIGINAL === undefined) {
    delete process.env[MUKTI_HOME_ENV];
  } else {
    process.env[MUKTI_HOME_ENV] = ORIGINAL;
  }
});

test('an explicit directory wins, absolute or relative', () => {
  const absolute = join(sandbox, 'explicit');
  assert.equal(resolveMuktiRoot(absolute), absolute);
  assert.equal(resolveMuktiRoot('relative-dir'), resolve(process.cwd(), 'relative-dir'));
});

test(`${MUKTI_HOME_ENV} is used when no directory is given`, () => {
  process.env[MUKTI_HOME_ENV] = join(sandbox, 'from-env');

  assert.equal(resolveMuktiRoot(), join(sandbox, 'from-env'));
});

test('an explicit directory beats the environment', () => {
  process.env[MUKTI_HOME_ENV] = join(sandbox, 'from-env');

  assert.equal(resolveMuktiRoot(join(sandbox, 'explicit')), join(sandbox, 'explicit'));
});

test('otherwise the home directory is used', () => {
  assert.equal(resolveMuktiRoot(), join(homedir(), '.mukti'));
});

test('resolving the root creates nothing', () => {
  const root = join(sandbox, 'untouched');

  resolveMuktiRoot(root);

  assert.equal(existsSync(root), false);
});

test('resolveMuktiHome still creates the database and log directories', () => {
  const root = join(sandbox, 'created');

  const home = resolveMuktiHome(root);

  assert.equal(home.root, root);
  assert.equal(existsSync(home.dbPath), true);
  assert.equal(existsSync(home.logDir), true);
});
