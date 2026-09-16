/**
 * Chat-client factory shared by every local-CLI AI provider.
 *
 * @remarks
 * Owns the mechanics common to running an agent CLI as a text producer: spawn,
 * stdin write, stdout/stderr collection, ENOENT and exit-code handling, and the
 * mapping onto the `{ choices, usage }` payload consumers expect. Everything
 * CLI-specific — flags, envelope field names, model catalogue, working
 * directory — comes from a {@link LocalCliAdapter}.
 *
 * The user's own CLI authentication is what pays for these completions, so the
 * `apiKey` passed to {@link create} is ignored and never reaches the subprocess.
 */
import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';

import type {
  AiChatClient,
  AiChatClientFactory,
  AiChatSendRequest,
} from '../types/ai-chat-client.interface';
import type { LocalCliAdapter } from '../types/local-cli-adapter.interface';

import { LocalCliError } from '../types/local-cli-adapter.interface';

/**
 * Minimal stdin used when a request carries no non-system turns.
 *
 * @remarks
 * Print-mode CLIs reject empty input. Some surfaces legitimately send only a
 * system prompt — notably Thought Map initial-question generation, where the
 * whole instruction lives in the system prompt and there is no user message
 * yet. This kickoff supplies the required input while deferring entirely to
 * that system prompt.
 */
const EMPTY_CONVERSATION_KICKOFF = 'Begin.';

export class LocalCliClientFactory implements AiChatClientFactory {
  private readonly logger = new Logger(LocalCliClientFactory.name);

  constructor(private readonly adapter: LocalCliAdapter) {}

  create(_apiKey: string): AiChatClient {
    return {
      chat: {
        send: (request: AiChatSendRequest) => this.send(request),
      },
    };
  }

  /** Default stdin payload: a labelled transcript of the non-system turns. */
  private renderInput(request: AiChatSendRequest): string {
    if (this.adapter.renderInput) {
      return this.adapter.renderInput(request);
    }

    return request.messages
      .filter((m) => m.role !== 'system')
      .map(
        (m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`,
      )
      .join('\n\n');
  }

  private run(args: string[], input: string): Promise<string> {
    const { binary, errorCode, installHint } = this.adapter;

    return new Promise((resolve, reject) => {
      let child: ReturnType<typeof spawn>;

      try {
        child = spawn(binary, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          ...this.adapter.spawnOptions?.(),
        });
      } catch (error) {
        reject(
          new LocalCliError(
            `Failed to start the ${binary} CLI: ${(error as Error).message}`,
            errorCode,
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
            new LocalCliError(
              `The \`${binary}\` CLI was not found on PATH. ${installHint}`,
              errorCode,
            ),
          );
          return;
        }
        reject(
          new LocalCliError(`${binary} CLI error: ${error.message}`, errorCode),
        );
      });

      child.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve(stdout);
          return;
        }
        const detail = stderr.trim() || stdout.trim() || 'no output';
        this.logger.error(`${binary} exited with code ${exitCode}: ${detail}`);
        reject(
          new LocalCliError(
            `The ${binary} CLI exited with code ${exitCode}. ${this.adapter.signInHint} Detail: ${detail}`,
            errorCode,
          ),
        );
      });

      child.stdin?.on('error', () => {
        // stdin may close early if the CLI errors before reading; the 'close'
        // handler reports the real failure, so swallow the broken pipe here.
      });
      child.stdin?.write(input);
      child.stdin?.end();
    });
  }

  private async send(request: AiChatSendRequest): Promise<unknown> {
    const input =
      this.renderInput(request).trim() || EMPTY_CONVERSATION_KICKOFF;
    const stdout = await this.run(this.adapter.buildArgs(request), input);
    const { completionTokens, content, promptTokens } =
      this.adapter.parseEnvelope(stdout);

    // A zero-exit run that produced no text is a provider failure, not a
    // Socratic answer. Returning it would let an empty assistant message reach
    // the user on any surface that does not check for one.
    if (!content.trim()) {
      throw new LocalCliError(
        `The ${this.adapter.binary} CLI returned an empty response.`,
        this.adapter.errorCode,
      );
    }

    return {
      choices: [{ message: { content } }],
      usage: {
        completion_tokens: completionTokens,
        prompt_tokens: promptTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }
}
