/**
 * The local AI CLIs Mukti can run on: what each one is called, what it costs,
 * and how to tell whether it is installed and signed in.
 *
 * @remarks
 * Shared by the launcher, which probes before anything starts, and the API,
 * which reports readiness and switches provider at runtime from Settings. Both
 * read these definitions so the terminal and the web app never disagree about
 * a CLI's name, its trade-off, its disclosure or how to fix it.
 *
 * This folder is loaded two ways: compiled to CommonJS with the rest of the
 * API, and imported as ESM TypeScript source by the launcher (Bun, Node type
 * stripping, esbuild). So files here import only Node built-ins at runtime,
 * refer to each other with `import type` only, and avoid TypeScript syntax that
 * type stripping rejects (enums, namespaces, parameter properties).
 *
 * Each CLI answers "is it installed?" and "is it signed in?" differently —
 * Antigravity has no auth subcommand at all, Codex reports sign-in only through
 * its exit code — so each carries its own probes. Neither probe may spend model
 * tokens: the launcher runs them on every start and Settings on every check.
 */

export interface CommandResult {
  readonly error?: Error;
  readonly status: null | number;
  readonly stderr: string;
  readonly stdout: string;
}

/** Which adapter in the API serves a CLI: the `AI_PROVIDER` value it registers under. */
export type LocalCliAdapterId = 'antigravity' | 'claude-code' | 'codex';

/** The command a CLI runs as, which is also how users name it (`--provider codex`). */
export type LocalCliId = 'agy' | 'claude' | 'codex';

export interface LocalCliProvider {
  /** The API adapter that runs this CLI. */
  readonly adapterId: LocalCliAdapterId;
  /**
   * Names this provider used to answer to. Still accepted from `--provider`,
   * `AI_PROVIDER` and a saved default, so commands and config files written
   * before the providers were named after their commands keep working.
   */
  readonly aliases: readonly string[];
  /** Executable looked up on PATH. */
  readonly binary: string;
  /**
   * Shown when the provider is selected: what it costs the user and what it
   * leaves on their machine, told before they discover it.
   */
  readonly disclosure?: string;
  /**
   * The `AI_PROVIDER` value, and what `--provider` takes: the command the CLI
   * runs as, which is the name its users already know it by.
   */
  readonly id: LocalCliId;
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

/** How usable a provider is on this machine. */
export type ProviderReadiness = 'missing' | 'ready' | 'signed-out';

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
export type RunCommand = (
  command: string,
  args: readonly string[],
) => Promise<CommandResult>;

async function versionOf(
  run: RunCommand,
  binary: string,
): Promise<string | undefined> {
  const result = await run(binary, ['--version']);
  if (result.error || result.status !== 0) {
    return undefined;
  }
  return result.stdout.trim() || 'unknown version';
}

const CLAUDE_CODE: LocalCliProvider = {
  adapterId: 'claude-code',
  aliases: ['claude-code'],
  binary: 'claude',
  id: 'claude',
  installRemediation:
    'Install Claude Code: https://docs.claude.com/en/docs/claude-code/overview',
  async isAuthenticated(run) {
    const status = await run('claude', ['auth', 'status']);
    try {
      return (
        (JSON.parse(status.stdout) as { loggedIn?: boolean }).loggedIn === true
      );
    } catch {
      return false;
    }
  },
  label: 'Claude CLI',
  signInRemediation: 'Run `claude login` and try again.',
  tradeOff: 'about 13-20 seconds per reply',
  version: (run) => versionOf(run, 'claude'),
};

/**
 * Measured on codex-cli 0.163.0 (add-codex-cli-provider design.md): 7-12s and
 * about 2.4-4.5k input tokens per reply, depending on the model.
 */
const CODEX: LocalCliProvider = {
  adapterId: 'codex',
  aliases: [],
  binary: 'codex',
  disclosure: [
    'Codex runs read-only with its tools switched off, from a folder Mukti owns, and keeps no',
    'session history of Mukti replies. Your Codex settings (config.toml, MCP servers) do not',
    'apply, apart from your default model. Your global ~/.codex/AGENTS.md does apply: Codex',
    'offers no way to leave it out, and a rule in it can change what a reply says.',
  ].join('\n'),
  id: 'codex',
  installRemediation:
    'Install the Codex CLI: https://developers.openai.com/codex/cli',
  // `codex login status` exits 0 when signed in and 1 when not, prints to
  // stderr either way, and runs no model.
  isAuthenticated: async (run) =>
    (await run('codex', ['login', 'status'])).status === 0,
  label: 'Codex CLI',
  signInRemediation: 'Run `codex login` and try again.',
  tradeOff: 'about 8-12 seconds per reply',
  version: (run) => versionOf(run, 'codex'),
};

const ANTIGRAVITY: LocalCliProvider = {
  adapterId: 'antigravity',
  aliases: ['antigravity'],
  binary: 'agy',
  // Measured end to end on agy 1.1.22 (design.md Decisions 12–13).
  disclosure: [
    'Antigravity is slower and heavier than Claude Code here: expect roughly 15–25k input tokens',
    'and 30–60 seconds per reply, billed to your own Antigravity subscription.',
    'Every reply is also kept in your Antigravity history (~/.gemini/antigravity-cli), filed',
    'under a "mukti-socratic" project, at about 1 MB per reply. Mukti never deletes it.',
    'Your global agy rules and hooks (~/.gemini/config) also apply, and can change the replies.',
  ].join('\n'),
  id: 'agy',
  installRemediation:
    'Install the Antigravity CLI (`agy`): https://antigravity.google/docs/cli/reference',
  // agy has no auth subcommand. Listing models needs a valid session and runs
  // no model, so a non-zero exit is a free "not signed in".
  isAuthenticated: async (run) => (await run('agy', ['models'])).status === 0,
  label: 'Antigravity CLI',
  signInRemediation:
    'Run `agy` once and follow the prompts to sign in, then try again.',
  tradeOff: 'about 30-60 seconds and 15-25k tokens per reply',
  version: (run) => versionOf(run, 'agy'),
};

/**
 * In detection order: the cheaper, faster providers first. Claude Code stays
 * first so that machines which already resolved to it keep doing so; Codex is
 * measured at Claude-like cost and latency; Antigravity costs several times
 * either.
 */
export const SUPPORTED_PROVIDERS: readonly LocalCliProvider[] = [
  CLAUDE_CODE,
  CODEX,
  ANTIGRAVITY,
];

/** Every name a supported provider answers to, current and former. */
export const PROVIDER_NAMES: readonly string[] = SUPPORTED_PROVIDERS.flatMap(
  (provider) => [provider.id, ...provider.aliases],
);

/** How usable a provider is, from its own two probes. */
export async function probeProvider(
  provider: LocalCliProvider,
  run: RunCommand,
): Promise<ProviderStatus> {
  const version = await provider.version(run);
  if (version === undefined) {
    return { provider, readiness: 'missing' };
  }
  // Only ask an installed CLI about sign-in: for agy that is the slow probe.
  const signedIn = await provider.isAuthenticated(run);
  return { provider, readiness: signedIn ? 'ready' : 'signed-out', version };
}

/**
 * The provider a name refers to: its id, or one of the names it used to go by.
 */
export function providerById(id: string): LocalCliProvider | undefined {
  return SUPPORTED_PROVIDERS.find((p) => p.id === id || p.aliases.includes(id));
}

/**
 * How usable every supported provider is, probed concurrently so the scan costs
 * the slowest CLI rather than the sum of them.
 */
export function scanProviders(
  run: RunCommand,
  providers: readonly LocalCliProvider[] = SUPPORTED_PROVIDERS,
): Promise<readonly ProviderStatus[]> {
  return Promise.all(providers.map((provider) => probeProvider(provider, run)));
}
