import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

import type {
  AiChatClient,
  AiChatClientFactory,
  AiChatMessage,
  AiChatSendRequest,
} from '../types/ai-chat-client.interface';

/**
 * Built-in Claude Code tools disabled for Socratic generation. Mukti only needs
 * text completions, never file edits or shell access, so every agentic tool is
 * denied to keep `claude -p` a pure text producer.
 */
const DISALLOWED_TOOLS =
  'Bash Edit Write Read Glob Grep WebFetch WebSearch NotebookEdit Task';

/** Shape of the `claude -p --output-format json` result envelope we rely on. */
interface ClaudeResultEnvelope {
  is_error?: boolean;
  result?: string;
  subtype?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/** Raised when the local `claude` CLI is missing, unauthenticated, or errors. */
export class ClaudeCliError extends Error {
  readonly code = 'CLAUDE_CLI_ERROR';
  readonly retriable = false;

  constructor(message: string) {
    super(message);
    this.name = 'ClaudeCliError';
  }
}

/**
 * Chat-client factory backed by the local `claude -p` (headless print) CLI.
 *
 * @remarks
 * Uses the developer's existing Claude authentication — the passed `apiKey` is
 * ignored and no `OPENROUTER_API_KEY` is required. The system prompt fully
 * replaces Claude Code's default coding prompt (so the model behaves as Mukti's
 * Socratic assistant), the remaining turns are streamed to the CLI over stdin,
 * and the JSON result envelope is mapped back into the `{ choices, usage }` shape
 * consumers already expect. Non-streaming; `cost` is reported as `0`.
 */
@Injectable()
export class ClaudeCodeClientFactory implements AiChatClientFactory {
  private readonly logger = new Logger(ClaudeCodeClientFactory.name);

  create(_apiKey: string): AiChatClient {
    return {
      chat: {
        send: (request: AiChatSendRequest) => this.send(request),
      },
    };
  }

  private parseEnvelope(stdout: string): unknown {
    let envelope: ClaudeResultEnvelope;

    try {
      envelope = JSON.parse(stdout) as ClaudeResultEnvelope;
    } catch {
      throw new ClaudeCliError(
        `Could not parse Claude CLI JSON output: ${stdout.slice(0, 200)}`,
      );
    }

    if (envelope.is_error) {
      throw new ClaudeCliError(
        `Claude CLI reported an error (${envelope.subtype ?? 'unknown'}): ${
          envelope.result ?? 'no detail'
        }`,
      );
    }

    const promptTokens = envelope.usage?.input_tokens ?? 0;
    const completionTokens = envelope.usage?.output_tokens ?? 0;

    return {
      choices: [{ message: { content: envelope.result ?? '' } }],
      usage: {
        completion_tokens: completionTokens,
        prompt_tokens: promptTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  /** Renders non-system turns into a labelled transcript for the print input. */
  private renderConversation(messages: AiChatMessage[]): string {
    return messages
      .map(
        (m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`,
      )
      .join('\n\n');
  }

  private runClaude(args: string[], input: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let child: ReturnType<typeof spawn>;

      try {
        child = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (error) {
        reject(
          new ClaudeCliError(
            `Failed to start the Claude CLI: ${(error as Error).message}`,
          ),
        );
        return;
      }

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

      child.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          reject(
            new ClaudeCliError(
              'The `claude` CLI was not found on PATH. Install Claude Code to use the claude-code provider.',
            ),
          );
          return;
        }
        reject(new ClaudeCliError(`Claude CLI error: ${error.message}`));
      });

      child.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(stdout);
          return;
        }
        const detail = stderr.trim() || stdout.trim() || 'no output';
        this.logger.error(`claude -p exited with code ${exitCode}: ${detail}`);
        reject(
          new ClaudeCliError(
            `The Claude CLI exited with code ${exitCode}. If unauthenticated, run \`claude login\`. Detail: ${detail}`,
          ),
        );
      });

      child.stdin?.on('error', () => {
        // stdin may close early if the CLI errors before reading; the 'close'
        // handler reports the real failure, so swallow the broken-pipe here.
      });
      child.stdin?.write(input);
      child.stdin?.end();
    });
  }

  private async send(request: AiChatSendRequest): Promise<unknown> {
    const systemPrompt = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversation = this.renderConversation(
      request.messages.filter((m) => m.role !== 'system'),
    );

    const args = [
      '-p',
      '--output-format',
      'json',
      '--disallowed-tools',
      DISALLOWED_TOOLS,
    ];

    if (systemPrompt.trim()) {
      args.push('--system-prompt', systemPrompt);
    }

    if (request.model?.trim()) {
      args.push('--model', request.model);
    }

    const stdout = await this.runClaude(args, conversation);
    return this.parseEnvelope(stdout);
  }
}
