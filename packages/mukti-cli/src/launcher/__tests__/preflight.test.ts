/**
 * Preflight's use of readiness the launcher already established.
 *
 * @remarks
 * Choosing a provider probes it; preflight then verifies it. Repeating agy's
 * sign-in probe costs another 5-7 seconds on every launch, so preflight takes
 * what selection found and only probes what it was not given.
 *
 * The failure paths exit the process, so they are covered by the end-to-end
 * checks rather than here.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ProviderStatus, RunCommand } from '../providers.ts';

import { runPreflight } from '../preflight.ts';
import { providerById } from '../providers.ts';

const AGY_READY = {
  'agy --version': '1.1.22\n',
  'agy models': 'gemini-3.8-flash-high\tGemini\n',
};

/** Records what was asked, answering as a signed-in agy. */
function probes() {
  const calls: string[] = [];
  const run: RunCommand = (command, args) => {
    const key = [command, ...args].join(' ');
    calls.push(key);
    return Promise.resolve({
      status: 0,
      stderr: '',
      stdout: AGY_READY[key as keyof typeof AGY_READY] ?? '',
    });
  };
  return { calls, run };
}

test('preflight probes the provider when it is given no readiness', async () => {
  const antigravity = providerById('agy')!;
  const { calls, run } = probes();

  const result = await runPreflight({ provider: antigravity, run });

  assert.equal(result.provider.id, 'agy');
  assert.equal(result.version, '1.1.22');
  assert.deepEqual(calls, ['agy --version', 'agy models']);
});

test('preflight reuses readiness the launcher already established', async () => {
  const antigravity = providerById('agy')!;
  const { calls, run } = probes();
  const status: ProviderStatus = {
    provider: antigravity,
    readiness: 'ready',
    version: '1.1.22',
  };

  const result = await runPreflight({ provider: antigravity, run, status });

  assert.equal(result.version, '1.1.22');
  assert.deepEqual(calls, [], 'no CLI should be probed twice');
});

test('preflight still runs the mode-specific checks it is given', async () => {
  const antigravity = providerById('agy')!;
  const { run } = probes();
  let ran = false;

  await runPreflight({
    checks: [
      {
        message: 'Checking ports',
        run: () => {
          ran = true;
          return undefined;
        },
      },
    ],
    provider: antigravity,
    run,
    status: { provider: antigravity, readiness: 'ready', version: '1.1.22' },
  });

  assert.equal(ran, true);
});
