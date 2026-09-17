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
 */
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
    input_tokens?: number;
    output_tokens?: number;
  };
}

export const CLAUDE_CLI_ERROR_CODE = 'CLAUDE_CLI_ERROR';

export class ClaudeCliAdapter implements LocalCliAdapter {
  readonly binary = 'claude';
  readonly errorCode = CLAUDE_CLI_ERROR_CODE;
  readonly installHint =
    'Install Claude Code to use the claude-code provider: https://docs.claude.com/en/docs/claude-code/overview';
  readonly providerId: LocalCliProviderId = 'claude-code';
  readonly signInHint = 'If unauthenticated, run `claude login`.';

  buildArgs(request: AiChatSendRequest): string[] {
    const args = [
      '-p',
      '--output-format',
      'json',
      '--disallowed-tools',
      DISALLOWED_TOOLS,
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

    return {
      completionTokens: envelope.usage?.output_tokens ?? 0,
      content: envelope.result ?? '',
      promptTokens: envelope.usage?.input_tokens ?? 0,
    };
  }
}
