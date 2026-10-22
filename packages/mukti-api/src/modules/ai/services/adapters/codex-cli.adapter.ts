/**
 * Adapter for the local OpenAI Codex CLI (`codex exec`).
 *
 * @remarks
 * Codex sits closer to Claude than to agy: its base prompt can be replaced, so
 * Mukti's system prompt becomes the base layer and no response schema is
 * forced. It is also a full coding agent, so most of this file exists to take
 * that away. Each choice below was measured against codex-cli 0.163.0 signed
 * in with ChatGPT (design.md, add-codex-cli-provider):
 *
 * - The system prompt replaces Codex's own through `model_instructions_file`,
 *   written per request into Mukti's workspace and removed in `afterRun`. A
 *   file rather than an inline value, because some surfaces put the learner's
 *   conversation in the system prompt and argv is visible to every process.
 * - {@link HARDENED_FLAGS} removes Codex's tools, injected context, user
 *   config and session history. Without them Codex ran `cat` on a file outside
 *   its workspace when asked; with them it could not.
 * - `--strict-config` makes a renamed setting fail loudly, and `warm()` proves
 *   the whole set is accepted before the first turn, without a model call.
 * - The prompt goes on stdin. The output is a JSONL event stream, not one
 *   envelope, and carries warnings that are not failures.
 *
 * What cannot be switched off: the user's global `~/.codex/AGENTS.md` still
 * reaches the model, and a few internal tools stay listed. The first is
 * disclosed to the user; the second is covered by the sandbox and the live
 * suite rather than by absence.
 */
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';
import type { AllowedModel } from '../../types/ai-model.interface';
import type {
  LocalCliAdapter,
  LocalCliCompletion,
  LocalCliProviderId,
} from '../../types/local-cli-adapter.interface';

import { LocalCliError } from '../../types/local-cli-adapter.interface';

export const CODEX_CLI_ERROR_CODE = 'CODEX_CLI_ERROR';

/**
 * The flags every Mukti run of `codex exec` carries, and the exact set the
 * boot-time self-check validates. Order is for readability only.
 *
 * @remarks
 * Never add an auto-approve, sandbox-bypass, hook-trust or extra-directory
 * flag here. Every `-c` key must exist in the installed Codex: strict config
 * rejects unknown ones (and `include_apply_patch_tool`, for one, does not
 * exist in 0.163.0).
 */
export const HARDENED_FLAGS: readonly string[] = [
  'exec',
  '--json',
  '--ephemeral',
  '--skip-git-repo-check',
  '--sandbox',
  'read-only',
  '--ignore-user-config',
  '--ignore-rules',
  '--strict-config',
  '-c',
  'model_reasoning_effort="low"',
  '-c',
  'web_search="disabled"',
  '-c',
  'include_permissions_instructions=false',
  '-c',
  'include_environment_context=false',
  '-c',
  'include_collaboration_mode_instructions=false',
  '-c',
  'skills.include_instructions=false',
  '-c',
  'project_doc_max_bytes=0',
  ...[
    'plugins',
    'apps',
    'hooks',
    'shell_tool',
    'unified_exec',
    'code_mode_host',
    'view_image',
    'image_generation',
    'browser_use',
    'computer_use',
    'in_app_browser',
    'multi_agent',
    'goals',
    'sleep_tool',
    'tool_suggest',
  ].flatMap((feature) => ['--disable', feature]),
];

/** The config key that carries the per-request instructions file. */
const INSTRUCTIONS_KEY = 'model_instructions_file';

/** Directory, inside the workspace, that holds per-request instructions files. */
const INSTRUCTIONS_DIR = '.mukti-codex';

/**
 * Used when a request carries no system message, so that Codex's own coding
 * prompt never comes back by omission.
 */
const FALLBACK_INSTRUCTIONS =
  'You are a helpful assistant. Reply to the latest user message directly, in plain text.';

/**
 * Kill backstop. Normal turns take 7-12s; a rejected sign-in takes ~19s to
 * exhaust Codex's own reconnects. Codex has no print deadline of its own.
 */
const HARD_TIMEOUT_MS = 120_000;

const PROBE_TIMEOUT_MS = 30_000;

/** What Codex prints when every setting was accepted and only the file is missing. */
const SELF_CHECK_PASS = /failed to read model instructions file/i;

export interface CodexCliAdapterOptions {
  /** Codex's home, for reading the user's default model. Defaults to `$CODEX_HOME` or `~/.codex`. */
  codexHome?: string;
  /** Runs `codex debug models`. Replaced in tests. */
  runModelListing?: () => Promise<CommandResult>;
  /** Runs `codex` with the given arguments and stdin closed. Replaced in tests. */
  runSelfCheck?: (args: readonly string[]) => Promise<CommandResult>;
  /** Mukti-owned working directory. Defaults to `~/.mukti/mukti-socratic`. */
  workspaceDir?: string;
}

export interface CommandResult {
  /** `null` when the process never ran to completion (not installed, killed). */
  exitCode: null | number;
  /** Set when the process could not be started. */
  spawnErrorCode?: string;
  stderr: string;
  stdout: string;
}

/** One line of `codex exec --json` output, as far as we read it. */
interface CodexEvent {
  error?: { message?: unknown };
  item?: { text?: unknown; type?: unknown };
  message?: unknown;
  type?: unknown;
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
}

export class CodexCliAdapter implements LocalCliAdapter {
  readonly binary = 'codex';
  readonly errorCode = CODEX_CLI_ERROR_CODE;
  readonly installHint =
    'Install the Codex CLI to use the codex provider: https://developers.openai.com/codex/cli';
  readonly providerId: LocalCliProviderId = 'codex';
  readonly signInHint = 'If it is not signed in, run `codex login`.';
  readonly timeoutMs = HARD_TIMEOUT_MS;

  private readonly codexHome: string;
  private models?: AllowedModel[];
  private readonly runModelListing: () => Promise<CommandResult>;
  private readonly runSelfCheck: (
    args: readonly string[],
  ) => Promise<CommandResult>;
  private readonly workspaceDir: string;

  constructor(options: CodexCliAdapterOptions = {}) {
    // `||` (not `??`): a blank CODEX_HOME is an unset one.
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    this.codexHome =
      options.codexHome ??
      (process.env.CODEX_HOME?.trim() || join(homedir(), '.codex'));
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    this.runModelListing =
      options.runModelListing ?? (() => runCodex(['debug', 'models']));
    this.runSelfCheck = options.runSelfCheck ?? runCodex;
    this.workspaceDir =
      options.workspaceDir ?? join(homedir(), '.mukti', 'mukti-socratic');
  }

  /** Removes the request's instructions file, however the run ended. */
  afterRun(args: readonly string[]): void {
    const path = instructionsPathFrom(args);
    if (path) {
      rmSync(path, { force: true });
    }
  }

  buildArgs(request: AiChatSendRequest): string[] {
    const args = [...HARDENED_FLAGS, '--cd', this.workspaceDir];

    // Omitted deliberately when unset, so the CLI applies its own default.
    if (request.model?.trim()) {
      args.push('-m', request.model);
    }

    // `responseFormat` is deliberately ignored: the base prompt is replaced,
    // so no schema is needed, and analytical surfaces keep their own shapes.
    const path = this.writeInstructions(request);
    args.push('-c', `${INSTRUCTIONS_KEY}=${tomlString(path)}`, '-');
    return args;
  }

  describeFailure(stdout: string): string | undefined {
    const events = parseEvents(stdout);

    const failed = [...events].reverse().find((e) => e.type === 'turn.failed');
    const failure = failed?.error?.message;
    if (typeof failure === 'string' && failure.trim()) {
      return unwrapApiError(failure);
    }

    const lastError = [...events]
      .reverse()
      .find((e) => e.type === 'error' && typeof e.message === 'string');
    return typeof lastError?.message === 'string'
      ? unwrapApiError(lastError.message)
      : undefined;
  }

  getModels(): AllowedModel[] {
    if (!this.models) {
      throw new LocalCliError(
        'The Codex model list has not been loaded; the API must finish starting first.',
        this.errorCode,
      );
    }
    return this.models;
  }

  parseEnvelope(stdout: string): LocalCliCompletion {
    const events = parseEvents(stdout);

    if (events.some((e) => e.type === 'turn.failed')) {
      throw new LocalCliError(
        `Codex CLI reported a failed turn: ${this.describeFailure(stdout) ?? 'no detail'}`,
        this.errorCode,
      );
    }

    const completed = [...events]
      .reverse()
      .find((e) => e.type === 'turn.completed');
    if (!completed) {
      throw new LocalCliError(
        `Could not find a completed turn in Codex CLI output: ${stdout.slice(0, 200)}`,
        this.errorCode,
      );
    }

    // The last agent message is the answer; earlier ones are progress notes.
    // `error` events and error items in a completed turn are warnings
    // (reconnects, disabled features), not failures.
    const answer = [...events]
      .reverse()
      .find(
        (e) => e.type === 'item.completed' && e.item?.type === 'agent_message',
      );
    const text = answer?.item?.text;

    return {
      // cached_input_tokens is a subset of input_tokens, and
      // reasoning_output_tokens a separate tally: neither is added.
      completionTokens: toCount(completed.usage?.output_tokens),
      content: typeof text === 'string' ? text.trim() : '',
      promptTokens: toCount(completed.usage?.input_tokens),
    };
  }

  spawnOptions(): { cwd: string } {
    // Recreated on demand: a missing cwd makes spawn fail with ENOENT, which
    // would be misreported as codex not being installed.
    mkdirSync(this.workspaceDir, { recursive: true });
    return { cwd: realpathSync(this.workspaceDir) };
  }

  async warm(): Promise<void> {
    mkdirSync(this.workspaceDir, { recursive: true });
    await this.assertFlagsAccepted();
    if (this.models) {
      return;
    }
    this.models = this.preferUserDefault(await this.listModels());
  }

  /**
   * Proves the installed Codex accepts every hardened setting, without a model
   * call: the run points at an instructions file that does not exist, and
   * Codex reads its configuration before that file. Only the missing-file
   * error means every key and feature was accepted.
   */
  private async assertFlagsAccepted(): Promise<void> {
    const missing = join(
      this.workspaceDir,
      INSTRUCTIONS_DIR,
      'self-check-absent.md',
    );
    const result = await this.runSelfCheck([
      ...HARDENED_FLAGS,
      '--cd',
      this.workspaceDir,
      '-c',
      `${INSTRUCTIONS_KEY}=${tomlString(missing)}`,
      '-',
    ]);

    if (result.spawnErrorCode === 'ENOENT') {
      throw new LocalCliError(
        `The \`codex\` CLI was not found on PATH. ${this.installHint}`,
        this.errorCode,
      );
    }

    const output = `${result.stderr}\n${result.stdout}`.trim();
    if (SELF_CHECK_PASS.test(output)) {
      return;
    }

    throw new LocalCliError(
      `The installed Codex CLI rejected Mukti's settings, so it cannot be run safely. ` +
        `Update Codex or Mukti. Codex said: ${firstLine(output) || 'no output'}`,
      this.errorCode,
    );
  }

  private async listModels(): Promise<AllowedModel[]> {
    const result = await this.runModelListing();
    if (result.exitCode !== 0) {
      const detail =
        result.stderr.trim() || result.stdout.trim() || 'no output';
      throw new LocalCliError(
        result.exitCode === null
          ? `Could not run \`codex debug models\` (${detail}). ${this.installHint}`
          : `Could not list Codex models: \`codex debug models\` exited with code ${result.exitCode}. Detail: ${detail}`,
        this.errorCode,
      );
    }

    const models = parseModelCatalogue(result.stdout);
    if (models.length === 0) {
      throw new LocalCliError(
        '`codex debug models` listed no models, so there is nothing to offer. Check that Codex is up to date.',
        this.errorCode,
      );
    }
    return models;
  }

  /** Moves the user's own Codex default to the front, when it is offered. */
  private preferUserDefault(models: AllowedModel[]): AllowedModel[] {
    let config: string;
    try {
      config = readFileSync(join(this.codexHome, 'config.toml'), 'utf8');
    } catch {
      return models;
    }
    const preferred = readTopLevelModel(config);
    const index = models.findIndex((m) => m.id === preferred);
    return index > 0
      ? [models[index], ...models.filter((_, i) => i !== index)]
      : models;
  }

  private writeInstructions(request: AiChatSendRequest): string {
    const system = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const dir = join(this.workspaceDir, INSTRUCTIONS_DIR);
    mkdirSync(dir, { mode: 0o700, recursive: true });
    const path = join(dir, `${randomBytes(12).toString('hex')}.md`);
    writeFileSync(path, system.trim() ? system : FALLBACK_INSTRUCTIONS, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    return path;
  }
}

/**
 * Parses `codex debug models`: entries Codex lists for users, in its own
 * priority order. It is a debug command, so anything unexpected is skipped
 * rather than trusted.
 */
export function parseModelCatalogue(stdout: string): AllowedModel[] {
  let catalogue: unknown;
  try {
    catalogue = JSON.parse(stdout);
  } catch {
    return [];
  }
  if (!isPlainObject(catalogue) || !Array.isArray(catalogue.models)) {
    return [];
  }

  return catalogue.models
    .filter(isPlainObject)
    .filter(
      (m) =>
        m.visibility === 'list' &&
        typeof m.slug === 'string' &&
        /^\S+$/.test(m.slug),
    )
    .map((m, index) => ({
      index,
      model: {
        id: m.slug as string,
        label:
          typeof m.display_name === 'string' && m.display_name.trim()
            ? m.display_name.trim()
            : (m.slug as string),
      },
      priority:
        typeof m.priority === 'number' ? m.priority : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(({ model }) => model);
}

/**
 * The top-level `model = "…"` from a Codex `config.toml`, ignoring any key of
 * the same name inside a table. Deliberately not a TOML parser.
 */
export function readTopLevelModel(config: string): string | undefined {
  for (const raw of config.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('[')) {
      return undefined;
    }
    const match = /^model\s*=\s*(["'])([^"']+)\1\s*(#.*)?$/.exec(line);
    if (match) {
      return match[2];
    }
  }
  return undefined;
}

function firstLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? ''
  );
}

/** The instructions file path, read back out of the arguments `buildArgs` made. */
function instructionsPathFrom(args: readonly string[]): string | undefined {
  const prefix = `${INSTRUCTIONS_KEY}=`;
  const setting = args.find((a) => a.startsWith(prefix));
  if (!setting) {
    return undefined;
  }
  try {
    const path: unknown = JSON.parse(setting.slice(prefix.length));
    return typeof path === 'string' ? path : undefined;
  } catch {
    return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** One JSON object per line; lines that are not JSON objects are skipped. */
function parseEvents(stdout: string): CodexEvent[] {
  const events: CodexEvent[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(line);
      if (isPlainObject(parsed)) {
        events.push(parsed as CodexEvent);
      }
    } catch {
      // Codex owns this stream; a stray line is not our failure.
    }
  }
  return events;
}

/** Runs `codex` to completion with stdin closed. */
function runCodex(args: readonly string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child: ReturnType<typeof spawn>;

    try {
      child = spawn('codex', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({
        exitCode: null,
        spawnErrorCode: (error as NodeJS.ErrnoException).code,
        stderr: (error as Error).message,
        stdout,
      });
      return;
    }

    const timer = setTimeout(() => {
      stderr += `\ncodex did not finish within ${PROBE_TIMEOUT_MS / 1000}s`;
      child.kill('SIGTERM');
    }, PROBE_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      resolve({
        exitCode: null,
        spawnErrorCode: error.code,
        stderr: error.message,
        stdout,
      });
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stderr, stdout });
    });
  });
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * A TOML basic string. JSON string escaping is a valid subset of it, so a path
 * with quotes, backslashes or non-ASCII characters round-trips intact.
 */
function tomlString(value: string): string {
  return JSON.stringify(value);
}

/**
 * Codex reports API errors as a JSON body inside the message. The nested
 * `error.message` is the readable part ("The 'x' model is not supported…").
 */
function unwrapApiError(message: string): string {
  try {
    const body: unknown = JSON.parse(message);
    if (isPlainObject(body) && isPlainObject(body.error)) {
      const nested = body.error.message;
      if (typeof nested === 'string' && nested.trim()) {
        return nested.trim();
      }
    }
  } catch {
    // Not JSON: the message is already readable.
  }
  return message.trim();
}
