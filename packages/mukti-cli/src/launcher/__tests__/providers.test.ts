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

import type { CommandResult, RunCommand } from '../providers.ts';

import {
  describeUnsupportedProvider,
  NO_PROVIDER_REMEDIATION,
  probeProvider,
  providerById,
  resolveProvider,
  scanProviders,
  SUPPORTED_PROVIDERS,
} from '../providers.ts';

/** A command runner that answers from a script and records what it was asked. */
function scripted(answers: Record<string, Partial<CommandResult>>) {
  const calls: string[] = [];
  const run = (command: string, args: readonly string[]): Promise<CommandResult> => {
    const key = [command, ...args].join(' ');
    calls.push(key);
    const answer = answers[key];
    if (!answer) {
      return Promise.resolve({
        error: new Error(`spawn ${command} ENOENT`),
        status: null,
        stderr: '',
        stdout: '',
      });
    }
    return Promise.resolve({ status: 0, stderr: '', stdout: '', ...answer });
  };
  return { calls, run };
}

test('supports Claude Code and Antigravity, in that detection order', () => {
  assert.deepEqual(
    SUPPORTED_PROVIDERS.map((p) => p.id),
    ['claude', 'agy']
  );
});

// `--provider claude` is the whole point of the id: it is what the user types
// to run the CLI, so it cannot drift from the command being run.
test('each provider is named after the command it runs', () => {
  for (const provider of SUPPORTED_PROVIDERS) {
    assert.equal(provider.id, provider.binary);
  }
});

const BOTH_READY_ANSWERS = {
  'agy --version': { stdout: '1.1.22\n' },
  'agy models': { stdout: 'gemini-3.8-flash-high\tGemini\n' },
  'claude --version': { stdout: '2.1.0 (Claude Code)\n' },
  'claude auth status': { stdout: '{"loggedIn":true}' },
};
const ONLY_AGY_READY = {
  'agy --version': { stdout: '1.1.22\n' },
  'agy models': { stdout: 'gemini-3.8-flash-high\tGemini\n' },
};
const CLAUDE_SIGNED_OUT = {
  ...ONLY_AGY_READY,
  'claude --version': { stdout: '2.1.0 (Claude Code)\n' },
  'claude auth status': { stdout: '{"loggedIn":false}' },
};
const NOTHING_READY = {
  'claude --version': { stdout: '2.1.0 (Claude Code)\n' },
  'claude auth status': { stdout: '{"loggedIn":false}' },
};

/** Resolution in an interactive session, unless a test says otherwise. */
type ResolveOptions = Parameters<typeof resolveProvider>[0];
function resolve(
  overrides: Omit<ResolveOptions, 'interactive'> & { interactive?: boolean }
): Promise<Awaited<ReturnType<typeof resolveProvider>>> {
  return resolveProvider({ interactive: true, ...overrides });
}

test('an explicit provider wins over AI_PROVIDER, the saved default and what is ready', async () => {
  const result = await resolve({
    env: 'claude',
    explicit: 'agy',
    run: scripted(BOTH_READY_ANSWERS).run,
    saved: 'claude',
  });

  assert.equal(result.kind, 'chosen');
  assert.equal(result.kind === 'chosen' && result.provider.id, 'agy');
  assert.equal(result.kind === 'chosen' && result.source, 'option');
});

test('AI_PROVIDER wins over the saved default', async () => {
  const result = await resolve({
    env: 'agy',
    run: scripted(BOTH_READY_ANSWERS).run,
    saved: 'claude',
  });

  assert.equal(result.kind === 'chosen' && result.provider.id, 'agy');
  assert.equal(result.kind === 'chosen' && result.source, 'env');
});

test('the saved default is used when nothing is named, and only it is probed', async () => {
  const probes = scripted(BOTH_READY_ANSWERS);

  const result = await resolve({ run: probes.run, saved: 'agy' });

  assert.equal(result.kind === 'chosen' && result.provider.id, 'agy');
  assert.equal(result.kind === 'chosen' && result.source, 'saved');
  assert.equal(result.kind === 'chosen' && result.status?.readiness, 'ready');
  assert.deepEqual(probes.calls, ['agy --version', 'agy models']);
});

test('AI_PROVIDER=openrouter is set aside and the ready CLIs decide', async () => {
  const result = await resolve({ env: 'openrouter', run: scripted(ONLY_AGY_READY).run });

  assert.equal(result.kind, 'detected');
  assert.equal(result.kind === 'detected' && result.provider.id, 'agy');
  assert.equal(result.kind === 'detected' && result.ignoredEnv, 'openrouter');
});

test('choosing again skips AI_PROVIDER and the saved default', async () => {
  const result = await resolve({
    choose: true,
    env: 'claude',
    run: scripted(BOTH_READY_ANSWERS).run,
    saved: 'claude',
  });

  assert.equal(result.kind, 'pick');
});

test('choosing again without a terminal asks for the flag instead', async () => {
  const result = await resolveProvider({
    choose: true,
    interactive: false,
    run: scripted(BOTH_READY_ANSWERS).run,
  });

  assert.deepEqual(result, { kind: 'needs-terminal' });
});

test('an unknown explicit provider is refused', async () => {
  assert.deepEqual(
    await resolve({ explicit: 'gemini-cli', run: scripted(BOTH_READY_ANSWERS).run }),
    {
      kind: 'unsupported',
      source: 'option',
      value: 'gemini-cli',
    }
  );
});

// Providers are named after the commands they run, but were called
// `claude-code` and `antigravity` first: scripts and saved defaults written
// then must keep resolving to the same CLI.
test('a provider can still be named by the name it used to go by', async () => {
  for (const [name, id] of [
    ['antigravity', 'agy'],
    ['claude-code', 'claude'],
  ]) {
    const explicit = await resolve({ explicit: name, run: scripted(BOTH_READY_ANSWERS).run });
    assert.equal(explicit.kind === 'chosen' && explicit.provider.id, id);

    const env = await resolve({ env: name, run: scripted(BOTH_READY_ANSWERS).run });
    assert.equal(env.kind === 'chosen' && env.provider.id, id);

    const saved = await resolve({ run: scripted(BOTH_READY_ANSWERS).run, saved: name });
    assert.equal(saved.kind === 'chosen' && saved.provider.id, id);
  }
});

test('an unknown AI_PROVIDER is refused', async () => {
  assert.deepEqual(await resolve({ env: 'gemini-cli', run: scripted(BOTH_READY_ANSWERS).run }), {
    kind: 'unsupported',
    source: 'env',
    value: 'gemini-cli',
  });
});

test('a saved default that is signed out is reported, and resolution moves on', async () => {
  const result = await resolve({ run: scripted(CLAUDE_SIGNED_OUT).run, saved: 'claude' });

  assert.equal(result.kind, 'detected');
  assert.equal(result.kind === 'detected' && result.provider.id, 'agy');
  assert.equal(result.kind === 'detected' && result.stale?.readiness, 'signed-out');
  assert.equal(result.kind === 'detected' && result.stale?.provider.id, 'claude');
});

test('a saved default that is no longer installed is reported, and resolution moves on', async () => {
  const result = await resolve({ run: scripted(ONLY_AGY_READY).run, saved: 'claude' });

  assert.equal(result.kind === 'detected' && result.provider.id, 'agy');
  assert.equal(result.kind === 'detected' && result.stale?.readiness, 'missing');
});

test('nothing ready, but something installed, reports which CLI to sign in to', async () => {
  const result = await resolve({ run: scripted(NOTHING_READY).run });

  assert.equal(result.kind, 'none');
  const signedOut =
    result.kind === 'none' ? result.statuses.filter((x) => x.readiness === 'signed-out') : [];
  assert.deepEqual(
    signedOut.map((x) => x.provider.id),
    ['claude']
  );
});

test('nothing installed at all is reported as such', async () => {
  const result = await resolve({ run: scripted({}).run });

  assert.equal(result.kind, 'none');
  assert.ok(
    result.kind === 'none' && result.statuses.every((x) => x.readiness === 'missing'),
    'every supported CLI should be missing'
  );
});

test('a single ready CLI is used without asking', async () => {
  const result = await resolve({ run: scripted(ONLY_AGY_READY).run });

  assert.equal(result.kind, 'detected');
  assert.equal(result.kind === 'detected' && result.provider.id, 'agy');
  assert.deepEqual(result.kind === 'detected' ? result.others : null, []);
  assert.equal(result.kind === 'detected' && result.status.readiness, 'ready');
});

test('several ready CLIs are picked between when a terminal is available', async () => {
  const result = await resolve({ run: scripted(BOTH_READY_ANSWERS).run });

  assert.equal(result.kind, 'pick');
  assert.deepEqual(result.kind === 'pick' ? result.statuses.map((x) => x.provider.id) : null, [
    'claude',
    'agy',
  ]);
});

test('several ready CLIs without a terminal use the first and say how to choose', async () => {
  const result = await resolveProvider({
    interactive: false,
    run: scripted(BOTH_READY_ANSWERS).run,
  });

  assert.equal(result.kind, 'detected');
  assert.equal(result.kind === 'detected' && result.provider.id, 'claude');
  assert.deepEqual(result.kind === 'detected' ? result.others.map((x) => x.provider.id) : null, [
    'agy',
  ]);
  assert.equal(result.kind === 'detected' && result.canChoose, true);
});

// The old behaviour picked the first *installed* CLI, so a signed-out Claude
// Code was chosen and then failed preflight while agy sat ready.
test('a signed-out CLI is never chosen automatically', async () => {
  const result = await resolve({ interactive: false, run: scripted(CLAUDE_SIGNED_OUT).run });

  assert.equal(result.kind === 'detected' && result.provider.id, 'agy');
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
    assert.ok(message.includes(provider.binary));
  }
});

test('the Antigravity sign-in probe lists models and never runs a completion', async () => {
  const agy = providerById('agy')!;
  const signedIn = scripted({ 'agy models': { stdout: 'gemini-3.8-flash-high\tGemini\n' } });
  const signedOut = scripted({ 'agy models': { status: 1, stderr: 'not signed in' } });

  assert.equal(await agy.isAuthenticated(signedIn.run), true);
  assert.equal(await agy.isAuthenticated(signedOut.run), false);
  for (const call of [...signedIn.calls, ...signedOut.calls]) {
    assert.equal(call, 'agy models');
    assert.doesNotMatch(call, /--print|(^| )-p( |$)|--prompt/);
  }
});

test('the Claude sign-in probe reads `claude auth status`', async () => {
  const claude = providerById('claude')!;

  assert.equal(
    await claude.isAuthenticated(
      scripted({ 'claude auth status': { stdout: '{"loggedIn":true}' } }).run
    ),
    true
  );
  assert.equal(
    await claude.isAuthenticated(
      scripted({ 'claude auth status': { stdout: '{"loggedIn":false}' } }).run
    ),
    false
  );
  assert.equal(
    await claude.isAuthenticated(scripted({ 'claude auth status': { stdout: 'oops' } }).run),
    false
  );
});

test('a CLI that cannot run or exits non-zero reports no version', async () => {
  const agy = providerById('agy')!;

  assert.equal(await agy.version(scripted({}).run), undefined);
  assert.equal(await agy.version(scripted({ 'agy --version': { status: 2 } }).run), undefined);
  assert.equal(
    await agy.version(scripted({ 'agy --version': { stdout: '1.1.22\n' } }).run),
    '1.1.22'
  );
});

test('each provider names its own sign-in step', () => {
  assert.match(providerById('claude')!.signInRemediation, /claude login/);
  assert.match(providerById('agy')!.signInRemediation, /`agy`/);
  assert.doesNotMatch(providerById('agy')!.signInRemediation, /claude/);
});

test('Antigravity discloses its cost, its latency, what it leaves behind and what can reach it', () => {
  const disclosure = providerById('agy')!.disclosure ?? '';

  assert.match(disclosure, /15–25k input tokens/);
  assert.match(disclosure, /30–60 seconds/);
  assert.match(disclosure, /Antigravity history/);
  assert.match(disclosure, /global agy rules and hooks/);
  assert.equal(providerById('claude')!.disclosure, undefined);
});

const BOTH_READY = {
  'agy --version': { stdout: '1.1.22\n' },
  'agy models': { stdout: 'gemini-3.8-flash-high\tGemini\n' },
  'claude --version': { stdout: '2.1.0 (Claude Code)\n' },
  'claude auth status': { stdout: '{"loggedIn":true}' },
};

test('readiness tells missing, signed out and ready apart', async () => {
  const claude = providerById('claude')!;

  assert.equal((await probeProvider(claude, scripted({}).run)).readiness, 'missing');
  assert.equal(
    (await probeProvider(claude, scripted({ 'claude --version': { stdout: '2.1.0\n' } }).run))
      .readiness,
    'signed-out'
  );

  const ready = await probeProvider(claude, scripted(BOTH_READY).run);
  assert.equal(ready.readiness, 'ready');
  assert.equal(ready.version, '2.1.0 (Claude Code)');
});

// Asking a CLI that is not installed whether it is signed in wastes a spawn,
// and for agy that spawn is the slow one.
test('a CLI that is not installed is not asked about sign-in', async () => {
  const probes = scripted({});

  await probeProvider(providerById('agy')!, probes.run);

  assert.deepEqual(probes.calls, ['agy --version']);
});

test('scanning covers every supported provider, in registry order', async () => {
  const statuses = await scanProviders(scripted(BOTH_READY).run);

  assert.deepEqual(
    statuses.map((s) => s.provider.id),
    ['claude', 'agy']
  );
  assert.deepEqual(
    statuses.map((s) => s.readiness),
    ['ready', 'ready']
  );
});

test('scanning never starts a completion', async () => {
  const probes = scripted(BOTH_READY);

  await scanProviders(probes.run);

  for (const call of probes.calls) {
    assert.doesNotMatch(call, /--print|--prompt|(^| )-p( |$)/);
  }
});

// agy's sign-in check alone takes 5-7s, so the scan must not be a sum of the
// providers' probe times.
test('scanning probes providers concurrently', async () => {
  let active = 0;
  let peak = 0;
  const run: RunCommand = async (command, args) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
    const key = [command, ...args].join(' ');
    return {
      status: 0,
      stderr: '',
      stdout: key.endsWith('--version') ? '1.0\n' : '{"loggedIn":true}',
    };
  };

  await scanProviders(run);

  assert.ok(peak > 1, `expected overlapping probes, saw a peak of ${peak}`);
});
