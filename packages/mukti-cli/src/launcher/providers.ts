/**
 * The local AI CLIs the launcher can run Mukti on, and how it picks one.
 *
 * @remarks
 * Mukti's local runtime borrows an AI CLI the developer has already installed
 * and signed in to, so nobody needs an API key. Each CLI answers "is it
 * installed?" and "is it signed in?" differently — Antigravity has no auth
 * subcommand at all — so each provider carries its own probes and its own
 * remediation. Neither probe may spend model tokens: it runs on every launch.
 *
 * Resolution is pure and injectable; `selectProvider` is the thin layer that
 * prints the outcome and exits when there is nothing usable.
 */
import { log } from '@clack/prompts';
import { spawn } from 'node:child_process';

import type { PickedProvider } from './provider-picker.ts';

import { pickProvider } from './provider-picker.ts';
import { readStoredProvider } from './provider-settings.ts';

export interface CommandResult {
  readonly error?: Error;
  readonly status: null | number;
  readonly stderr: string;
  readonly stdout: string;
}

/** Where an explicitly named provider came from. */
export type ExplicitSource = 'env' | 'option';

export interface LocalCliProvider {
  /** Executable looked up on PATH. */
  readonly binary: string;
  /**
   * Shown when the provider is selected: what it costs the user and what it
   * leaves on their machine, told before they discover it.
   */
  readonly disclosure?: string;
  /** The `AI_PROVIDER` value, and what `--provider` accepts. */
  readonly id: LocalCliProviderId;
  readonly installRemediation: string;
  /** Signed in and usable. Must not consume model tokens. */
  isAuthenticated(run: RunCommand): Promise<boolean>;
  /** Human name, e.g. for "Preflight passed — Antigravity CLI 1.1.22". */
  readonly label: string;
  readonly signInRemediation: string;
  /**
   * One line on what this provider costs per reply, shown beside it when the
   * user is choosing. Kept next to the fuller {@link LocalCliProvider.disclosure}
   * so the two cannot drift.
   */
  readonly tradeOff: string;
  /** Installed version, or `undefined` when the CLI cannot be run. */
  version(run: RunCommand): Promise<string | undefined>;
}

export type LocalCliProviderId = 'antigravity' | 'claude-code';

/** How usable a provider is on this machine. */
export type ProviderReadiness = 'missing' | 'ready' | 'signed-out';

export type ProviderResolution =
  | {
      /** Choosing was asked for, but there is no terminal to ask in. */
      readonly kind: 'needs-terminal';
    }
  | {
      /** No supported CLI is ready; the statuses say whether any is installed. */
      readonly kind: 'none';
      readonly statuses: readonly ProviderStatus[];
    }
  | {
      /** Nothing left to decide: use this provider. */
      readonly kind: 'chosen';
      readonly provider: LocalCliProvider;
      readonly source: ProviderSource;
      /** Readiness already established, when the choice was the saved default. */
      readonly status?: ProviderStatus;
    }
  | {
      /** Resolved from what is ready here, with nothing to ask. */
      readonly canChoose?: boolean;
      readonly ignoredEnv?: string;
      readonly kind: 'detected';
      /** Other ready CLIs, when the first was taken without asking. */
      readonly others: readonly ProviderStatus[];
      readonly provider: LocalCliProvider;
      /** A saved default that is no longer usable. */
      readonly stale?: ProviderStatus;
      readonly status: ProviderStatus;
    }
  | {
      /** Several CLIs are ready and the user can be asked which to use. */
      readonly ignoredEnv?: string;
      readonly kind: 'pick';
      readonly stale?: ProviderStatus;
      readonly statuses: readonly ProviderStatus[];
    }
  | { readonly kind: 'unsupported'; readonly source: ExplicitSource; readonly value: string };

/** Where the chosen provider came from. */
export type ProviderSource = 'env' | 'option' | 'saved';

export interface ProviderStatus {
  readonly provider: LocalCliProvider;
  readonly readiness: ProviderReadiness;
  /** The CLI's reported version, when it is installed. */
  readonly version?: string;
}

/**
 * Runs a command to completion. Injected so probes can be tested, and
 * asynchronous so several providers can be probed at once — agy's sign-in check
 * alone takes 5-7 seconds.
 */
export type RunCommand = (command: string, args: readonly string[]) => Promise<CommandResult>;

/** The hosted provider. Meaningless to a launcher that always runs a local CLI. */
const HOSTED_PROVIDER = 'openrouter';

/** Long enough for agy's model listing, short enough to not hang a launch. */
const PROBE_TIMEOUT_MS = 30_000;

async function versionOf(run: RunCommand, binary: string): Promise<string | undefined> {
  const result = await run(binary, ['--version']);
  if (result.error || result.status !== 0) {
    return undefined;
  }
  return result.stdout.trim() || 'unknown version';
}

const CLAUDE_CODE: LocalCliProvider = {
  binary: 'claude',
  id: 'claude-code',
  installRemediation: 'Install Claude Code: https://docs.claude.com/en/docs/claude-code/overview',
  async isAuthenticated(run) {
    const status = await run('claude', ['auth', 'status']);
    try {
      return (JSON.parse(status.stdout) as { loggedIn?: boolean }).loggedIn === true;
    } catch {
      return false;
    }
  },
  label: 'Claude CLI',
  signInRemediation: 'Run `claude login` and try again.',
  tradeOff: 'about 13-20 seconds per reply',
  version: (run) => versionOf(run, 'claude'),
};

const ANTIGRAVITY: LocalCliProvider = {
  binary: 'agy',
  // Measured end to end on agy 1.1.22 (design.md Decisions 12–13).
  disclosure: [
    'Antigravity is slower and heavier than Claude Code here: expect roughly 15–25k input tokens',
    'and 30–60 seconds per reply, billed to your own Antigravity subscription.',
    'Every reply is also kept in your Antigravity history (~/.gemini/antigravity-cli), filed',
    'under a "mukti-socratic" project, at about 1 MB per reply. Mukti never deletes it.',
    'Your global agy rules and hooks (~/.gemini/config) also apply, and can change the replies.',
  ].join('\n'),
  id: 'antigravity',
  installRemediation:
    'Install the Antigravity CLI (`agy`): https://antigravity.google/docs/cli/reference',
  // agy has no auth subcommand. Listing models needs a valid session and runs
  // no model, so a non-zero exit is a free "not signed in".
  isAuthenticated: async (run) => (await run('agy', ['models'])).status === 0,
  label: 'Antigravity CLI',
  signInRemediation: 'Run `agy` once and follow the prompts to sign in, then try again.',
  tradeOff: 'about 30-60 seconds and 15-25k tokens per reply',
  version: (run) => versionOf(run, 'agy'),
};

/** In detection order: the cheaper, faster provider first. */
export const SUPPORTED_PROVIDERS: readonly LocalCliProvider[] = [CLAUDE_CODE, ANTIGRAVITY];

export const NO_PROVIDER_REMEDIATION = [
  'Mukti runs on an AI CLI you have installed and signed in to. Install one of:',
  ...SUPPORTED_PROVIDERS.map(
    (p) => `  • ${p.installRemediation}\n    then start Mukti with --provider ${p.id}`
  ),
].join('\n');

/**
 * Runs a probe with stdin closed. `agy` waits on an open stdin, so a probe with
 * a pipe attached would hang until killed.
 */
export const runCommand: RunCommand = (command, args) =>
  new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    let stdout = '';
    let stderr = '';

    try {
      child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ error: error as Error, status: null, stderr: '', stdout: '' });
      return;
    }

    const deadline = setTimeout(() => {
      stderr += `\n${command} did not finish within ${PROBE_TIMEOUT_MS / 1000}s`;
      child.kill('SIGTERM');
    }, PROBE_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (error) => {
      clearTimeout(deadline);
      resolve({ error, status: null, stderr, stdout });
    });
    child.on('close', (status) => {
      clearTimeout(deadline);
      resolve({ status, stderr, stdout });
    });
  });

export type Selection =
  | {
      readonly headline: string;
      readonly kind: 'failed';
      readonly remediation?: string;
    }
  | {
      readonly kind: 'ready';
      /** Everything to tell the user about this choice, in order. */
      readonly notices: readonly string[];
      readonly provider: LocalCliProvider;
      /** Save this provider as the default — after preflight passes. */
      readonly remember: boolean;
      /** Readiness already established, for preflight to reuse. */
      readonly status?: ProviderStatus;
    };

export function describeUnsupportedProvider(options: {
  readonly source: ExplicitSource;
  readonly value: string;
}): string {
  const origin = options.source === 'option' ? '--provider' : 'AI_PROVIDER';
  const ids = SUPPORTED_PROVIDERS.map((p) => p.id).join(', ');
  return `${origin} is "${options.value}", which is not a supported local AI CLI. Use one of: ${ids}.`;
}

/** How usable a provider is, from its own two probes. */
export async function probeProvider(
  provider: LocalCliProvider,
  run: RunCommand
): Promise<ProviderStatus> {
  const version = await provider.version(run);
  if (version === undefined) {
    return { provider, readiness: 'missing' };
  }
  // Only ask an installed CLI about sign-in: for agy that is the slow probe.
  const signedIn = await provider.isAuthenticated(run);
  return { provider, readiness: signedIn ? 'ready' : 'signed-out', version };
}

export function providerById(id: string): LocalCliProvider | undefined {
  return SUPPORTED_PROVIDERS.find((p) => p.id === id);
}

/**
 * Decides which provider to run, and what to do when the decision needs the
 * user: an explicit option, then AI_PROVIDER, then the saved default, then
 * whichever CLIs are ready on this machine.
 *
 * @remarks
 * An explicitly named provider wins over a remembered one — a flag or a
 * variable is a statement about this launch — and is returned unprobed, so
 * preflight reports its own failure. A saved default is softer: when it is no
 * longer usable it comes back as `stale` and resolution carries on, because the
 * user can still run Mukti on something else.
 *
 * Nothing here prints or prompts; the caller decides how to ask.
 */
export async function resolveProvider(options: {
  /** Ask again, ignoring AI_PROVIDER and the saved default. */
  readonly choose?: boolean;
  readonly env?: string;
  readonly explicit?: string;
  /** Whether the user can be prompted at all. */
  readonly interactive: boolean;
  readonly run: RunCommand;
  /** The user's saved default, already known to name a supported provider. */
  readonly saved?: string;
}): Promise<ProviderResolution> {
  const explicit = options.explicit?.trim();
  if (explicit) {
    const provider = providerById(explicit);
    return provider
      ? { kind: 'chosen', provider, source: 'option' }
      : { kind: 'unsupported', source: 'option', value: explicit };
  }

  if (options.choose && !options.interactive) {
    return { kind: 'needs-terminal' };
  }

  const env = options.env?.trim();
  const ignoredEnv = env === HOSTED_PROVIDER ? env : undefined;
  if (!options.choose && env && !ignoredEnv) {
    const provider = providerById(env);
    return provider
      ? { kind: 'chosen', provider, source: 'env' }
      : { kind: 'unsupported', source: 'env', value: env };
  }

  let stale: ProviderStatus | undefined;
  const saved = options.choose ? undefined : options.saved?.trim();
  const savedProvider = saved ? providerById(saved) : undefined;
  if (savedProvider) {
    const status = await probeProvider(savedProvider, options.run);
    if (status.readiness === 'ready') {
      return { kind: 'chosen', provider: savedProvider, source: 'saved', status };
    }
    stale = status;
  }

  const statuses = await scanProviders(options.run);
  const ready = statuses.filter((status) => status.readiness === 'ready');

  if (ready.length === 0) {
    return { kind: 'none', statuses };
  }
  if (ready.length === 1) {
    return {
      ignoredEnv,
      kind: 'detected',
      others: [],
      provider: ready[0].provider,
      stale,
      status: ready[0],
    };
  }
  if (options.interactive) {
    return { ignoredEnv, kind: 'pick', stale, statuses };
  }

  const [first, ...others] = ready;
  return {
    canChoose: true,
    ignoredEnv,
    kind: 'detected',
    others,
    provider: first.provider,
    stale,
    status: first,
  };
}

/**
 * How usable every supported provider is, probed concurrently so the scan costs
 * the slowest CLI rather than the sum of them.
 */
export function scanProviders(
  run: RunCommand,
  providers: readonly LocalCliProvider[] = SUPPORTED_PROVIDERS
): Promise<readonly ProviderStatus[]> {
  return Promise.all(providers.map((provider) => probeProvider(provider, run)));
}

/**
 * Chooses the provider for this launch and says where the choice came from.
 *
 * @remarks
 * Decides and reports, but neither prints nor exits, so every outcome is
 * testable — including the failures. Nothing is written to disk here either:
 * `remember` is an intention the launcher acts on once preflight has proved the
 * provider works, because a default that cannot boot is worse than none.
 */
export async function selectProvider(options: {
  readonly choose?: boolean;
  readonly explicit?: string;
  /** The Mukti home holding the saved default. */
  readonly home: string;
  readonly interactive: boolean;
  readonly pick?: (statuses: readonly ProviderStatus[]) => Promise<PickedProvider | undefined>;
  readonly run?: RunCommand;
  readonly save?: boolean;
}): Promise<Selection> {
  const { home, interactive, pick = pickProvider, run = runCommand } = options;
  const notices: string[] = [];

  const stored = readStoredProvider(
    home,
    SUPPORTED_PROVIDERS.map((provider) => provider.id)
  );
  if (stored.warning) {
    notices.push(stored.warning);
  }

  const resolution = await resolveProvider({
    choose: options.choose,
    env: process.env.AI_PROVIDER,
    explicit: options.explicit,
    interactive,
    run,
    saved: stored.provider,
  });

  switch (resolution.kind) {
    case 'chosen': {
      notices.push(`AI provider: ${resolution.provider.id} ${describeSource(resolution.source)}`);
      return ready({
        notices,
        provider: resolution.provider,
        remember: resolution.source === 'option' && options.save === true,
        status: resolution.status,
      });
    }

    case 'detected': {
      notices.push(...explainSkipped(resolution.stale, resolution.ignoredEnv));
      notices.push(
        resolution.canChoose
          ? `AI provider: ${resolution.provider.id} — the first ready AI CLI. Run with --choose in a terminal to pick another.`
          : `AI provider: ${resolution.provider.id} — the only AI CLI ready on this machine.`
      );
      return ready({
        notices,
        provider: resolution.provider,
        remember: false,
        status: resolution.status,
      });
    }

    case 'needs-terminal':
      return {
        headline: 'Choosing an AI provider needs an interactive terminal.',
        kind: 'failed',
        remediation: 'Run with --provider <id> --save to set your default without a prompt.',
      };

    case 'none':
      return describeNothingReady(resolution.statuses);

    case 'pick': {
      notices.push(...explainSkipped(resolution.stale, resolution.ignoredEnv));
      const picked = await pick(resolution.statuses);
      if (!picked) {
        return { headline: 'No AI provider chosen.', kind: 'failed' };
      }
      notices.push(
        `AI provider: ${picked.provider.id} (chosen just now${
          picked.remember ? ', and saved as your default' : ', for this launch only'
        }).`
      );
      return ready({
        notices,
        provider: picked.provider,
        remember: picked.remember,
        status: resolution.statuses.find((s) => s.provider.id === picked.provider.id),
      });
    }

    case 'unsupported':
      return { headline: describeUnsupportedProvider(resolution), kind: 'failed' };
  }
}

/**
 * Chooses a provider, printing what it decided, and exits non-zero when it
 * cannot. The launchers' entry point into selection.
 */
export async function selectProviderOrExit(
  options: Parameters<typeof selectProvider>[0]
): Promise<Selection & { kind: 'ready' }> {
  const selection = await selectProvider(options);

  if (selection.kind === 'failed') {
    return fail(selection.headline, selection.remediation);
  }
  for (const notice of selection.notices) {
    // The cost disclosure is the one notice worth interrupting for.
    if (notice === selection.provider.disclosure) {
      log.warn(notice);
    } else {
      log.info(notice);
    }
  }
  return selection;
}

/** Nothing is ready: say whether to sign in or to install. */
function describeNothingReady(statuses: readonly ProviderStatus[]): Selection {
  const signedOut = statuses.filter((status) => status.readiness === 'signed-out');
  if (signedOut.length > 0) {
    return {
      headline: 'No AI CLI on this machine is signed in.',
      kind: 'failed',
      remediation: signedOut
        .map(({ provider }) => `  • ${provider.label}: ${provider.signInRemediation}`)
        .join('\n'),
    };
  }
  return {
    headline: 'No supported AI CLI was found on PATH.',
    kind: 'failed',
    remediation: NO_PROVIDER_REMEDIATION,
  };
}

/** Where a named or remembered provider came from, as the user should read it. */
function describeSource(source: ProviderSource): string {
  switch (source) {
    case 'env':
      return '(from AI_PROVIDER)';
    case 'option':
      return '(from --provider)';
    case 'saved':
      return '(your saved default — change it with --choose)';
  }
}

/** Why a saved default or an AI_PROVIDER value was passed over. */
function explainSkipped(stale?: ProviderStatus, ignoredEnv?: string): string[] {
  const notices: string[] = [];
  if (stale) {
    notices.push(
      `Your saved default ${stale.provider.id} is ${
        stale.readiness === 'missing' ? 'not installed' : 'not signed in'
      }, so it is not being used.`
    );
  }
  if (ignoredEnv) {
    notices.push(
      `Ignoring AI_PROVIDER=${ignoredEnv}: the local launcher always runs a local AI CLI.`
    );
  }
  return notices;
}

function fail(headline: string, remediation?: string): never {
  log.error(headline);
  if (remediation) {
    log.message(remediation);
  }
  process.exit(1);
}

/** A successful selection, with the provider's own disclosure appended. */
function ready(selection: {
  notices: string[];
  provider: LocalCliProvider;
  remember: boolean;
  status?: ProviderStatus;
}): Selection {
  const notices = [...selection.notices];
  if (selection.provider.disclosure) {
    notices.push(selection.provider.disclosure);
  }
  return {
    kind: 'ready',
    notices,
    provider: selection.provider,
    remember: selection.remember,
    status: selection.status,
  };
}
