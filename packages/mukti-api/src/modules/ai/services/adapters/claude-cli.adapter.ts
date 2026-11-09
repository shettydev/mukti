/**
 * Adapter for the local Claude Code (`claude -p`) CLI.
 *
 * @remarks
 * Reproduces the invocation this provider has always used: headless print mode,
 * JSON output, every built-in agentic tool denied, and the Socratic system
 * prompt replacing Claude Code's default coding prompt. Mukti needs text
 * completions only — never file edits or shell access — so denying the tools
 * keeps `claude -p` a pure text producer.
 *
 * This adapter ignores the request's `responseFormat` declaration. It has no
 * need of it: `claude -p` accepts `--system-prompt`, so Mukti's Socratic
 * instruction is carried the same way it is on the hosted provider, and the
 * arguments below are identical whether or not a caller declared a shape.
 * Schema enforcement is a workaround for a CLI whose built-in prompt cannot be
 * replaced, which is not this one.
 *
 * Two more guarantees (claude-code-ai-provider): every run passes
 * `--no-session-persistence`, so no Mukti prompt or reply is written to
 * Claude Code's session history under `~/.claude/projects/`, and
 * `--setting-sources ""`, so no project or user settings or `CLAUDE.md` reach a
 * Socratic reply. Runs start from a folder Mukti owns, never the API's working
 * directory. `--bare` would also do the second, but it skips the OAuth and
 * keychain reads a subscription sign-in needs. `warm()` checks the installed
 * CLI lists both options, without a model run.
 */
import { spawn } from 'child_process';
import { mkdirSync, realpathSync } from 'fs';
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

/** Built-in Claude Code tools disabled for Socratic generation. */
const DISALLOWED_TOOLS =
  'Bash Edit Write Read Glob Grep WebFetch WebSearch NotebookEdit Task';

/**
 * Models offered when this provider is active. Ids are Claude CLI aliases
 * passed verbatim to `claude -p --model`.
 */
const CLAUDE_CODE_MODELS: AllowedModel[] = [
  { id: 'sonnet', label: 'Claude Sonnet' },
  { id: 'opus', label: 'Claude Opus' },
  { id: 'haiku', label: 'Claude Haiku' },
];

/** Shape of the `claude -p --output-format json` envelope we rely on. */
interface ClaudeResultEnvelope {
  is_error?: boolean;
  result?: string;
  subtype?: string;
  usage?: {
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export const CLAUDE_CLI_ERROR_CODE = 'CLAUDE_CLI_ERROR';

/** Options every run needs, and that `warm()` requires the CLI to list. */
export const CLAUDE_REQUIRED_FLAGS = [
  '--no-session-persistence',
  '--setting-sources',
] as const;

const HELP_TIMEOUT_MS = 30_000;

export interface ClaudeCliAdapterOptions {
  /** Runs `claude --help`. Replaced in tests. */
  runHelp?: () => Promise<HelpResult>;
  /** Mukti-owned working directory. Defaults to `~/.mukti/mukti-socratic`. */
  workspaceDir?: string;
}

export interface HelpResult {
  /** `null` when the process never ran to completion. */
  exitCode: null | number;
  /** Set when the process could not be started. */
  spawnErrorCode?: string;
  stderr: string;
  stdout: string;
}

export class ClaudeCliAdapter implements LocalCliAdapter {
  readonly binary = 'claude';
  readonly errorCode = CLAUDE_CLI_ERROR_CODE;
  readonly installHint =
    'Install Claude Code to use the claude-code provider: https://docs.claude.com/en/docs/claude-code/overview';
  readonly providerId: LocalCliProviderId = 'claude-code';
  readonly signInHint = 'If unauthenticated, run `claude login`.';

  /** The Mukti-owned folder runs start from. */
  readonly workspace: string;

  private readonly runHelp: () => Promise<HelpResult>;

  constructor(options: ClaudeCliAdapterOptions = {}) {
    this.workspace =
      options.workspaceDir ?? join(homedir(), '.mukti', 'mukti-socratic');
    this.runHelp = options.runHelp ?? runClaudeHelp;
  }

  buildArgs(request: AiChatSendRequest): string[] {
    const args = [
      '-p',
      '--output-format',
      'json',
      '--disallowed-tools',
      DISALLOWED_TOOLS,
      // No transcript under ~/.claude/projects/, and no project or user
      // settings or CLAUDE.md: an empty source list loads none of them.
      '--no-session-persistence',
      '--setting-sources',
      '',
    ];

    const systemPrompt = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    if (systemPrompt.trim()) {
      args.push('--system-prompt', systemPrompt);
    }

    // Omitted deliberately when unset, so the CLI applies its own default.
    if (request.model?.trim()) {
      args.push('--model', request.model);
    }

    return args;
  }

  getModels(): AllowedModel[] {
    return CLAUDE_CODE_MODELS;
  }

  parseEnvelope(stdout: string): LocalCliCompletion {
    let envelope: ClaudeResultEnvelope;

    try {
      envelope = JSON.parse(stdout) as ClaudeResultEnvelope;
    } catch {
      throw new LocalCliError(
        `Could not parse Claude CLI JSON output: ${stdout.slice(0, 200)}`,
        this.errorCode,
      );
    }

    if (envelope.is_error) {
      throw new LocalCliError(
        `Claude CLI reported an error (${envelope.subtype ?? 'unknown'}): ${
          envelope.result ?? 'no detail'
        }`,
        this.errorCode,
      );
    }

    // input_tokens is only the uncached remainder; the prompt sent is that plus
    // what was written to and read from the prompt cache.
    const usage = envelope.usage;
    return {
      completionTokens: usage?.output_tokens ?? 0,
      content: envelope.result ?? '',
      promptTokens:
        (usage?.input_tokens ?? 0) +
        (usage?.cache_creation_input_tokens ?? 0) +
        (usage?.cache_read_input_tokens ?? 0),
    };
  }

  spawnOptions(): { cwd: string } {
    // Recreated on demand: a missing cwd makes spawn fail with ENOENT, which
    // would be misreported as claude not being installed.
    mkdirSync(this.workspace, { recursive: true });
    return { cwd: realpathSync(this.workspace) };
  }

  /**
   * Proves the installed CLI accepts every required option, without a model
   * run. An older Claude Code that lacks one is reported not ready rather than
   * silently persisting transcripts or loading outside settings.
   */
  async warm(): Promise<void> {
    mkdirSync(this.workspace, { recursive: true });
    const result = await this.runHelp();

    if (result.spawnErrorCode === 'ENOENT') {
      throw new LocalCliError(
        `The \`claude\` CLI was not found on PATH. ${this.installHint}`,
        this.errorCode,
      );
    }

    const help = `${result.stdout}\n${result.stderr}`;
    const missing = CLAUDE_REQUIRED_FLAGS.filter(
      (flag) => !help.includes(flag),
    );
    if (missing.length > 0) {
      throw new LocalCliError(
        `The installed Claude Code does not support ${missing.join(' and ')}, which Mukti needs ` +
          `so that no session transcript is saved and no outside settings apply. ` +
          `Update Claude Code (\`claude update\`) and try again.`,
        this.errorCode,
      );
    }
  }
}

/** Runs `claude --help` with stdin closed. It starts no model. */
function runClaudeHelp(): Promise<HelpResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child: ReturnType<typeof spawn>;

    try {
      child = spawn('claude', ['--help'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
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
      stderr += `\nclaude --help did not finish within ${HELP_TIMEOUT_MS / 1000}s`;
      child.kill('SIGTERM');
    }, HELP_TIMEOUT_MS);

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
