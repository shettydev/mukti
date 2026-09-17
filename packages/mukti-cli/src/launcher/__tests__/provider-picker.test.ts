/**
 * The provider picker: what it offers, and what it does with the answer.
 *
 * @remarks
 * The prompts are injected, so these cases never need a terminal. What they pin
 * is the shape of the question: every supported CLI is visible, so the user
 * learns what exists; the ones that cannot be used say why and cannot be
 * chosen; and the trade-off that makes this choice matter sits next to each
 * option rather than in documentation nobody reads at that moment.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PickerPrompts, SelectOption } from '../provider-picker.ts';
import type { ProviderStatus } from '../providers.ts';

import { isInteractive, pickProvider } from '../provider-picker.ts';
import { providerById } from '../providers.ts';

const CLAUDE = providerById('claude-code')!;
const ANTIGRAVITY = providerById('antigravity')!;

const ready = (provider = CLAUDE): ProviderStatus => ({
  provider,
  readiness: 'ready',
  version: '1.0',
});

/** Cancellation sentinel, standing in for the prompt library's own. */
const CANCELLED = Symbol('cancelled');

function prompts(answers: { confirm?: boolean | symbol; select?: string | symbol }): {
  asked: string[];
  offered: SelectOption[];
  prompts: PickerPrompts;
} {
  const offered: SelectOption[] = [];
  const asked: string[] = [];
  return {
    asked,
    offered,
    prompts: {
      confirm: (options) => {
        asked.push(`confirm: ${options.message}`);
        return Promise.resolve(answers.confirm ?? true);
      },
      isCancel: (value) => value === CANCELLED,
      select: (options) => {
        asked.push(`select: ${options.message}`);
        offered.push(...options.options);
        return Promise.resolve(answers.select ?? options.initialValue ?? '');
      },
    },
  };
}

test('every supported CLI is offered, with its status and its trade-off', async () => {
  const statuses: ProviderStatus[] = [
    ready(CLAUDE),
    { provider: ANTIGRAVITY, readiness: 'signed-out', version: '1.1.22' },
  ];
  const harness = prompts({});

  await pickProvider(statuses, harness.prompts);

  assert.deepEqual(
    harness.offered.map((option) => option.value),
    ['claude-code', 'antigravity']
  );
  const [claude, antigravity] = harness.offered;
  assert.match(claude.hint ?? '', new RegExp(CLAUDE.tradeOff));
  assert.match(antigravity.hint ?? '', new RegExp(ANTIGRAVITY.tradeOff));
});

test('a CLI that is signed out or missing is shown, with the reason, and cannot be chosen', async () => {
  const statuses: ProviderStatus[] = [
    { provider: CLAUDE, readiness: 'missing' },
    { provider: ANTIGRAVITY, readiness: 'signed-out', version: '1.1.22' },
  ];
  const harness = prompts({});

  await pickProvider(statuses, harness.prompts);

  const [claude, antigravity] = harness.offered;
  assert.equal(claude.disabled, true);
  assert.match(claude.hint ?? '', /not installed/);
  assert.equal(antigravity.disabled, true);
  assert.match(antigravity.hint ?? '', /not signed in/);
});

test('the first ready CLI is selected to begin with', async () => {
  const statuses: ProviderStatus[] = [
    { provider: CLAUDE, readiness: 'signed-out', version: '2.1.0' },
    ready(ANTIGRAVITY),
  ];
  const harness = prompts({});

  const picked = await pickProvider(statuses, harness.prompts);

  assert.equal(picked?.provider.id, 'antigravity');
});

test('keeping the pick asks to remember it', async () => {
  const harness = prompts({ confirm: true, select: 'antigravity' });

  const picked = await pickProvider([ready(CLAUDE), ready(ANTIGRAVITY)], harness.prompts);

  assert.equal(picked?.provider.id, 'antigravity');
  assert.equal(picked?.remember, true);
  assert.equal(harness.asked.length, 2);
  assert.match(harness.asked[1], /confirm:/);
});

test('declining to remember still uses the pick for this launch', async () => {
  const harness = prompts({ confirm: false, select: 'antigravity' });

  const picked = await pickProvider([ready(CLAUDE), ready(ANTIGRAVITY)], harness.prompts);

  assert.equal(picked?.provider.id, 'antigravity');
  assert.equal(picked?.remember, false);
});

test('cancelling the choice picks nothing', async () => {
  const harness = prompts({ select: CANCELLED });

  assert.equal(await pickProvider([ready(CLAUDE), ready(ANTIGRAVITY)], harness.prompts), undefined);
  assert.equal(harness.asked.length, 1, 'it should not go on to ask about remembering');
});

test('cancelling the remember question picks nothing', async () => {
  const harness = prompts({ confirm: CANCELLED, select: 'antigravity' });

  assert.equal(await pickProvider([ready(CLAUDE), ready(ANTIGRAVITY)], harness.prompts), undefined);
});

test('a session is interactive only with a terminal on both ends and no CI', () => {
  const tty = { isTTY: true };
  const pipe = { isTTY: false };

  assert.equal(isInteractive({ env: {}, stdin: tty, stdout: tty }), true);
  assert.equal(isInteractive({ env: {}, stdin: pipe, stdout: tty }), false);
  assert.equal(isInteractive({ env: {}, stdin: tty, stdout: pipe }), false);
  assert.equal(isInteractive({ env: { CI: 'true' }, stdin: tty, stdout: tty }), false);
});
