/**
 * Choosing a provider for one launch: what the user is told, and what is saved.
 *
 * @remarks
 * `selectProvider` decides and reports; it neither prints nor exits, so every
 * outcome — including the failures — is checked here rather than in an
 * end-to-end run. Two rules carry most of the weight: every launch says where
 * its choice came from, because the providers differ in cost and latency; and
 * nothing is saved as a default until preflight has proved it works.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import type { PickedProvider } from '../provider-picker.ts';
import type { ProviderStatus, RunCommand } from '../providers.ts';

import { readStoredProvider, writeStoredProvider } from '../provider-settings.ts';
import { selectProvider } from '../providers.ts';

const BOTH_READY = {
  'agy --version': '1.1.22\n',
  'agy models': 'gemini-3.8-flash-high\tGemini\n',
  'claude --version': '2.1.0 (Claude Code)\n',
  'claude auth status': '{"loggedIn":true}',
};
const ONLY_AGY_READY = {
  'agy --version': '1.1.22\n',
  'agy models': 'gemini-3.8-flash-high\tGemini\n',
};
const CLAUDE_SIGNED_OUT = {
  'claude --version': '2.1.0 (Claude Code)\n',
  'claude auth status': '{"loggedIn":false}',
};

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'mukti-selection-test-'));
  delete process.env.AI_PROVIDER;
});

afterEach(() => {
  rmSync(home, { force: true, recursive: true });
  delete process.env.AI_PROVIDER;
});

function runner(answers: Record<string, string>): RunCommand {
  return (command, args) => {
    const key = [command, ...args].join(' ');
    return Promise.resolve(
      key in answers
        ? { status: 0, stderr: '', stdout: answers[key] }
        : { error: new Error(`spawn ${command} ENOENT`), status: null, stderr: '', stdout: '' }
    );
  };
}

/** Selection in a session that can be prompted, answering the picker as told. */
function select(options: {
  answers?: Record<string, string>;
  choose?: boolean;
  explicit?: string;
  interactive?: boolean;
  pick?: (statuses: readonly ProviderStatus[]) => Promise<PickedProvider | undefined>;
  save?: boolean;
}) {
  return selectProvider({
    choose: options.choose,
    explicit: options.explicit,
    home,
    interactive: options.interactive ?? true,
    pick: options.pick ?? (() => Promise.resolve(undefined)),
    run: runner(options.answers ?? BOTH_READY),
    save: options.save,
  });
}

test('a named provider is used, reported as such, and not saved', async () => {
  const selection = await select({ explicit: 'antigravity' });

  assert.equal(selection.kind, 'ready');
  assert.equal(selection.kind === 'ready' && selection.provider.id, 'antigravity');
  assert.equal(selection.kind === 'ready' && selection.remember, false);
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /--provider/);
});

test('a named provider with --save is remembered only once preflight has passed', async () => {
  const selection = await select({ explicit: 'antigravity', save: true });

  assert.equal(selection.kind === 'ready' && selection.remember, true);
  // Selection itself writes nothing: the launcher saves after preflight.
  assert.equal(readStoredProvider(home, ['antigravity', 'claude-code']).provider, undefined);
});

test('AI_PROVIDER is reported as the source', async () => {
  process.env.AI_PROVIDER = 'antigravity';

  const selection = await select({});

  assert.equal(selection.kind === 'ready' && selection.provider.id, 'antigravity');
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /AI_PROVIDER/);
});

test('a saved default is used, and the report says how to change it', async () => {
  writeStoredProvider(home, 'antigravity');

  const selection = await select({});

  assert.equal(selection.kind === 'ready' && selection.provider.id, 'antigravity');
  assert.equal(selection.kind === 'ready' && selection.status?.readiness, 'ready');
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /--choose/);
});

// With two providers, a stale default always leaves at most one CLI ready, so
// there is nothing to pick: the remaining one is used and nothing is saved.
// The picker's stale notice matters once a third provider exists.
test('a saved default that is signed out is explained, and the ready CLI is used', async () => {
  writeStoredProvider(home, 'claude-code');

  const selection = await select({
    answers: { ...ONLY_AGY_READY, ...CLAUDE_SIGNED_OUT },
    pick: () => Promise.reject(new Error('the picker should not be reached')),
  });

  const notices = selection.kind === 'ready' ? selection.notices.join('\n') : '';
  assert.match(notices, /not signed in/);
  assert.equal(selection.kind === 'ready' && selection.provider.id, 'antigravity');
  assert.equal(selection.kind === 'ready' && selection.remember, false);
});

test('a pick that is kept is remembered', async () => {
  const selection = await select({
    pick: (statuses) => Promise.resolve({ provider: statuses[1].provider, remember: true }),
  });

  assert.equal(selection.kind === 'ready' && selection.provider.id, 'antigravity');
  assert.equal(selection.kind === 'ready' && selection.remember, true);
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /chosen just now/);
});

test('the only ready CLI is used and reported as the only one', async () => {
  const selection = await select({ answers: ONLY_AGY_READY });

  assert.equal(selection.kind === 'ready' && selection.provider.id, 'antigravity');
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /only/i);
});

test('several ready CLIs without a terminal take the first and say how to choose', async () => {
  const selection = await select({ interactive: false });

  assert.equal(selection.kind === 'ready' && selection.provider.id, 'claude-code');
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /--choose/);
});

test('cancelling the picker fails the launch without starting anything', async () => {
  const selection = await select({ pick: () => Promise.resolve(undefined) });

  assert.equal(selection.kind, 'failed');
  assert.match(selection.kind === 'failed' ? selection.headline : '', /no ai provider chosen/i);
});

test('asking to choose without a terminal explains how to set a default instead', async () => {
  const selection = await select({ choose: true, interactive: false });

  assert.equal(selection.kind, 'failed');
  assert.match(selection.kind === 'failed' ? (selection.remediation ?? '') : '', /--provider/);
  assert.match(selection.kind === 'failed' ? (selection.remediation ?? '') : '', /--save/);
});

test('nothing ready, but something installed, points at that CLI’s sign-in step', async () => {
  const selection = await select({ answers: CLAUDE_SIGNED_OUT });

  assert.equal(selection.kind, 'failed');
  assert.match(selection.kind === 'failed' ? (selection.remediation ?? '') : '', /claude login/);
});

test('nothing installed points at every install step', async () => {
  const selection = await select({ answers: {} });

  assert.equal(selection.kind, 'failed');
  const remediation = selection.kind === 'failed' ? (selection.remediation ?? '') : '';
  assert.match(remediation, /docs\.claude\.com/);
  assert.match(remediation, /antigravity\.google/);
});

test('an unsupported provider name is refused', async () => {
  const selection = await select({ explicit: 'gemini-cli' });

  assert.equal(selection.kind, 'failed');
  assert.match(selection.kind === 'failed' ? selection.headline : '', /gemini-cli/);
});

test('a malformed settings file is reported and ignored', async () => {
  writeFileSync(join(home, 'config.json'), '{not json');

  const selection = await select({ answers: ONLY_AGY_READY });

  assert.equal(selection.kind, 'ready');
  assert.match(selection.kind === 'ready' ? selection.notices.join('\n') : '', /config\.json/);
});
