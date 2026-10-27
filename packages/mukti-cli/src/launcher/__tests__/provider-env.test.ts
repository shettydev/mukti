/**
 * What the launcher hands the API about its provider choice.
 *
 * @remarks
 * Settings saves a switched provider to the file named here, so the path must
 * follow the Mukti home exactly — including `--data-dir` — or a saved default
 * would land somewhere the next launch never reads.
 */
import assert from 'node:assert/strict';
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
    [PROVIDER_SETTINGS_ENV]: join('/tmp/x', 'config.json'),
    [PROVIDER_SOURCE_ENV]: 'option',
  });
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
