/**
 * What the launcher hands the API about its provider choice.
 *
 * @remarks
 * Settings saves a switched provider to the file named here, so the path must
 * follow the Mukti home exactly — including `--data-dir` — or a saved default
 * would land somewhere the next launch never reads.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';

import { PROVIDER_SETTINGS_ENV, PROVIDER_SOURCE_ENV, providerEnv } from '../provider-env.ts';
import { providerSettingsPath } from '../provider-settings.ts';
import { providerById } from '../providers.ts';

const codex = providerById('codex')!;

test('names the provider, the saved-default file and the source', () => {
  const env = providerEnv({ home: '/tmp/x', provider: codex, source: 'option' });

  assert.deepEqual(env, {
    AI_PROVIDER: 'codex',
    MUKTI_STUDY_ARM: undefined,
    [PROVIDER_SETTINGS_ENV]: join('/tmp/x', 'config.json'),
    [PROVIDER_SOURCE_ENV]: 'option',
  });
});

test('passes the real database path even when the API connects through a supplied URI', () => {
  const env = providerEnv({
    dbPath: '/custom/mukti/local-db',
    home: '/custom/mukti',
    provider: codex,
    source: 'option',
  });
  assert.equal(env.MUKTI_LOCAL_DB_PATH, '/custom/mukti/local-db');
});

test('the settings file is the one the launcher itself reads', () => {
  const home = join('/srv', 'mukti-data');
  const env = providerEnv({ home, provider: codex, source: 'saved' });

  assert.equal(env[PROVIDER_SETTINGS_ENV], providerSettingsPath(home));
});

test('every selection source is passed through as is', () => {
  for (const source of ['detected', 'env', 'option', 'picked', 'saved'] as const) {
    assert.equal(providerEnv({ home: '/h', provider: codex, source })[PROVIDER_SOURCE_ENV], source);
  }
});

test('an ordinary launch removes an inherited study arm from the child process', () => {
  const result = spawnSync(process.execPath, ['-e', 'console.log(process.env.MUKTI_STUDY_ARM)'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MUKTI_STUDY_ARM: 'baseline-direct',
      ...providerEnv({ home: '/h', provider: codex, source: 'saved' }),
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'undefined');
});
