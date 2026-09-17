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
import { spawnSync } from 'node:child_process';

export interface CommandResult {
  readonly error?: Error;
  readonly status: null | number;
  readonly stderr: string;
  readonly stdout: string;
}

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
  isAuthenticated(run: RunCommand): boolean;
  /** Human name, e.g. for "Preflight passed — Antigravity CLI 1.1.22". */
  readonly label: string;
  readonly signInRemediation: string;
  /** Installed version, or `undefined` when the CLI cannot be run. */
  version(run: RunCommand): string | undefined;
}

export type LocalCliProviderId = 'antigravity' | 'claude-code';

export type ProviderResolution =
  | {
      /** Set when `AI_PROVIDER` held a non-local value that was set aside. */
      readonly ignoredEnv?: string;
      readonly kind: 'detected';
      /** Other supported CLIs that are also installed. */
      readonly others: readonly LocalCliProvider[];
      readonly provider: LocalCliProvider;
    }
  | {
      readonly kind: 'chosen';
      readonly provider: LocalCliProvider;
      readonly source: ProviderSource;
    }
  | { readonly kind: 'none' }
  | { readonly kind: 'unsupported'; readonly source: ProviderSource; readonly value: string };

/** Where an explicit choice came from. */
export type ProviderSource = 'env' | 'option';

/** Runs a command to completion. Injected so probes can be tested. */
export type RunCommand = (command: string, args: readonly string[]) => CommandResult;

/** The hosted provider. Meaningless to a launcher that always runs a local CLI. */
const HOSTED_PROVIDER = 'openrouter';

function versionOf(run: RunCommand, binary: string): string | undefined {
  const result = run(binary, ['--version']);
  if (result.error || result.status !== 0) {
    return undefined;
  }
  return result.stdout.trim() || 'unknown version';
}

const CLAUDE_CODE: LocalCliProvider = {
  binary: 'claude',
  id: 'claude-code',
  installRemediation: 'Install Claude Code: https://docs.claude.com/en/docs/claude-code/overview',
  isAuthenticated(run) {
    const status = run('claude', ['auth', 'status']);
    try {
      return (JSON.parse(status.stdout) as { loggedIn?: boolean }).loggedIn === true;
    } catch {
      return false;
    }
  },
  label: 'Claude CLI',
  signInRemediation: 'Run `claude login` and try again.',
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
  isAuthenticated: (run) => run('agy', ['models']).status === 0,
  label: 'Antigravity CLI',
  signInRemediation: 'Run `agy` once and follow the prompts to sign in, then try again.',
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
export const runCommand: RunCommand = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  });
  return {
    error: result.error,
    status: result.status,
    stderr: result.stderr ?? '',
    stdout: result.stdout ?? '',
  };
};

export function describeUnsupportedProvider(options: {
  readonly source: ProviderSource;
  readonly value: string;
}): string {
  const origin = options.source === 'option' ? '--provider' : 'AI_PROVIDER';
  const ids = SUPPORTED_PROVIDERS.map((p) => p.id).join(', ');
  return `${origin} is "${options.value}", which is not a supported local AI CLI. Use one of: ${ids}.`;
}

export function providerById(id: string): LocalCliProvider | undefined {
  return SUPPORTED_PROVIDERS.find((p) => p.id === id);
}

/**
 * Decides which provider to run: an explicit option, then `AI_PROVIDER`, then
 * the first supported CLI found on PATH.
 */
export function resolveProvider(options: {
  readonly env?: string;
  readonly explicit?: string;
  readonly run: RunCommand;
}): ProviderResolution {
  const explicit = options.explicit?.trim();
  if (explicit) {
    const provider = providerById(explicit);
    return provider
      ? { kind: 'chosen', provider, source: 'option' }
      : { kind: 'unsupported', source: 'option', value: explicit };
  }

  const env = options.env?.trim();
  if (env && env !== HOSTED_PROVIDER) {
    const provider = providerById(env);
    return provider
      ? { kind: 'chosen', provider, source: 'env' }
      : { kind: 'unsupported', source: 'env', value: env };
  }

  const installed = SUPPORTED_PROVIDERS.filter((p) => p.version(options.run) !== undefined);
  const [provider, ...others] = installed;
  if (!provider) {
    return { kind: 'none' };
  }
  return env
    ? { ignoredEnv: env, kind: 'detected', others, provider }
    : { kind: 'detected', others, provider };
}

/**
 * Resolves the provider for this launch and says what was chosen, or exits
 * non-zero with remediation when nothing usable was found.
 */
export function selectProvider(explicit?: string, run: RunCommand = runCommand): LocalCliProvider {
  const resolution = resolveProvider({ env: process.env.AI_PROVIDER, explicit, run });

  switch (resolution.kind) {
    case 'chosen': {
      const origin = resolution.source === 'option' ? '--provider' : 'AI_PROVIDER';
      log.info(`AI provider: ${resolution.provider.id} (from ${origin})`);
      return disclose(resolution.provider);
    }
    case 'detected': {
      if (resolution.ignoredEnv) {
        log.info(
          `Ignoring AI_PROVIDER=${resolution.ignoredEnv}: the local launcher always runs a local AI CLI.`
        );
      }
      const alternatives = resolution.others.length
        ? ` Also installed: ${resolution.others
            .map((p) => `${p.id} (use --provider ${p.id})`)
            .join(', ')}.`
        : '';
      log.info(
        `AI provider: ${resolution.provider.id} — found \`${resolution.provider.binary}\` on PATH.${alternatives}`
      );
      return disclose(resolution.provider);
    }
    case 'none':
      return fail('No supported AI CLI was found on PATH.', NO_PROVIDER_REMEDIATION);
    case 'unsupported':
      return fail(describeUnsupportedProvider(resolution));
  }
}

function disclose(provider: LocalCliProvider): LocalCliProvider {
  if (provider.disclosure) {
    log.warn(provider.disclosure);
  }
  return provider;
}

function fail(headline: string, remediation?: string): never {
  log.error(headline);
  if (remediation) {
    log.message(remediation);
  }
  process.exit(1);
}
