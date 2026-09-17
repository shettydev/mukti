/**
 * Which local AI CLI the launcher runs, and how it checks one is usable.
 *
 * @remarks
 * Resolution is explicit option → `AI_PROVIDER` → whatever is on PATH, and the
 * choice is always reported: the two providers differ sharply in cost and
 * latency, so an unexplained switch between them would be a silent regression.
 * Probes must never spend model tokens — a sign-in check that bills the user on
 * every launch is not a check anyone would keep running.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { CommandResult } from '../providers.ts';

import {
  describeUnsupportedProvider,
  NO_PROVIDER_REMEDIATION,
  providerById,
  resolveProvider,
  SUPPORTED_PROVIDERS,
} from '../providers.ts';

/** A command runner that answers from a script and records what it was asked. */
function scripted(answers: Record<string, Partial<CommandResult>>) {
  const calls: string[] = [];
  const run = (command: string, args: readonly string[]): CommandResult => {
    const key = [command, ...args].join(' ');
    calls.push(key);
    const answer = answers[key];
    if (!answer) {
      return { error: new Error(`spawn ${command} ENOENT`), status: null, stderr: '', stdout: '' };
    }
    return { status: 0, stderr: '', stdout: '', ...answer };
  };
  return { calls, run };
}

const BOTH_INSTALLED = {
  'agy --version': { stdout: '1.1.22\n' },
  'claude --version': { stdout: '2.1.0 (Claude Code)\n' },
};

test('supports Claude Code and Antigravity, in that detection order', () => {
  assert.deepEqual(
    SUPPORTED_PROVIDERS.map((p) => p.id),
    ['claude-code', 'antigravity']
  );
});

test('an explicit provider wins over AI_PROVIDER and over what is installed', () => {
  const { run } = scripted(BOTH_INSTALLED);

  const result = resolveProvider({ env: 'claude-code', explicit: 'antigravity', run });

  assert.equal(result.kind, 'chosen');
  assert.equal(result.kind === 'chosen' && result.provider.id, 'antigravity');
  assert.equal(result.kind === 'chosen' && result.source, 'option');
});

test('AI_PROVIDER is used when no provider is named explicitly', () => {
  const { run } = scripted(BOTH_INSTALLED);

  const result = resolveProvider({ env: 'antigravity', run });

  assert.equal(result.kind === 'chosen' && result.provider.id, 'antigravity');
  assert.equal(result.kind === 'chosen' && result.source, 'env');
});

// The local launcher always runs a local CLI; an OpenRouter setting left in a
// developer's shell must not stop it from starting.
test('AI_PROVIDER=openrouter is set aside and detection runs instead', () => {
  const { run } = scripted({ 'agy --version': { stdout: '1.1.22\n' } });

  const result = resolveProvider({ env: 'openrouter', run });

  assert.equal(result.kind, 'detected');
  assert.equal(result.kind === 'detected' && result.provider.id, 'antigravity');
  assert.equal(result.kind === 'detected' && result.ignoredEnv, 'openrouter');
});

test('an unknown explicit provider is refused', () => {
  const { run } = scripted(BOTH_INSTALLED);

  assert.deepEqual(resolveProvider({ explicit: 'agy', run }), {
    kind: 'unsupported',
    source: 'option',
    value: 'agy',
  });
});

test('an unknown AI_PROVIDER is refused', () => {
  const { run } = scripted(BOTH_INSTALLED);

  assert.deepEqual(resolveProvider({ env: 'gemini-cli', run }), {
    kind: 'unsupported',
    source: 'env',
    value: 'gemini-cli',
  });
});

test('detection picks the first installed CLI and names the others', () => {
  const { run } = scripted(BOTH_INSTALLED);

  const result = resolveProvider({ run });

  assert.equal(result.kind, 'detected');
  assert.equal(result.kind === 'detected' && result.provider.id, 'claude-code');
  assert.deepEqual(result.kind === 'detected' && result.others.map((p) => p.id), ['antigravity']);
});

test('detection finds Antigravity when it is the only CLI installed', () => {
  const { run } = scripted({ 'agy --version': { stdout: '1.1.22\n' } });

  const result = resolveProvider({ run });

  assert.equal(result.kind === 'detected' && result.provider.id, 'antigravity');
  assert.deepEqual(result.kind === 'detected' && result.others, []);
});

test('reports that nothing usable is installed', () => {
  const { run } = scripted({ 'claude --version': { status: 127 } });

  assert.deepEqual(resolveProvider({ run }), { kind: 'none' });
});

test('the no-provider remediation names every supported option', () => {
  for (const provider of SUPPORTED_PROVIDERS) {
    assert.ok(NO_PROVIDER_REMEDIATION.includes(provider.installRemediation));
    assert.ok(NO_PROVIDER_REMEDIATION.includes(`--provider ${provider.id}`));
  }
});

test('an unsupported value is explained with every supported id', () => {
  const message = describeUnsupportedProvider({ source: 'env', value: 'gemini-cli' });

  assert.match(message, /AI_PROVIDER/);
  assert.match(message, /gemini-cli/);
  for (const provider of SUPPORTED_PROVIDERS) {
    assert.ok(message.includes(provider.id));
  }
});

test('the Antigravity sign-in probe lists models and never runs a completion', () => {
  const agy = providerById('antigravity')!;
  const signedIn = scripted({ 'agy models': { stdout: 'gemini-3.8-flash-high\tGemini\n' } });
  const signedOut = scripted({ 'agy models': { status: 1, stderr: 'not signed in' } });

  assert.equal(agy.isAuthenticated(signedIn.run), true);
  assert.equal(agy.isAuthenticated(signedOut.run), false);
  for (const call of [...signedIn.calls, ...signedOut.calls]) {
    assert.equal(call, 'agy models');
    assert.doesNotMatch(call, /--print|(^| )-p( |$)|--prompt/);
  }
});

test('the Claude sign-in probe reads `claude auth status`', () => {
  const claude = providerById('claude-code')!;

  assert.equal(
    claude.isAuthenticated(scripted({ 'claude auth status': { stdout: '{"loggedIn":true}' } }).run),
    true
  );
  assert.equal(
    claude.isAuthenticated(
      scripted({ 'claude auth status': { stdout: '{"loggedIn":false}' } }).run
    ),
    false
  );
  assert.equal(
    claude.isAuthenticated(scripted({ 'claude auth status': { stdout: 'oops' } }).run),
    false
  );
});

test('a CLI that cannot run or exits non-zero reports no version', () => {
  const agy = providerById('antigravity')!;

  assert.equal(agy.version(scripted({}).run), undefined);
  assert.equal(agy.version(scripted({ 'agy --version': { status: 2 } }).run), undefined);
  assert.equal(agy.version(scripted({ 'agy --version': { stdout: '1.1.22\n' } }).run), '1.1.22');
});

test('each provider names its own sign-in step', () => {
  assert.match(providerById('claude-code')!.signInRemediation, /claude login/);
  assert.match(providerById('antigravity')!.signInRemediation, /`agy`/);
  assert.doesNotMatch(providerById('antigravity')!.signInRemediation, /claude/);
});

test('Antigravity discloses its cost, its latency, what it leaves behind and what can reach it', () => {
  const disclosure = providerById('antigravity')!.disclosure ?? '';

  assert.match(disclosure, /15–25k input tokens/);
  assert.match(disclosure, /30–60 seconds/);
  assert.match(disclosure, /Antigravity history/);
  assert.match(disclosure, /global agy rules and hooks/);
  assert.equal(providerById('claude-code')!.disclosure, undefined);
});
