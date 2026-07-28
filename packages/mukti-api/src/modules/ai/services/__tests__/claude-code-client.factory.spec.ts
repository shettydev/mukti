import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';

import {
  ClaudeCliError,
  ClaudeCodeClientFactory,
} from '../claude-code-client.factory';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

/**
 * Builds a fake child process. `outcome` decides what happens after stdin ends:
 * - { stdout, code: 0 } → emits stdout data then closes successfully
 * - { code: n } → closes with a non-zero exit and optional stderr
 * - { errorCode } → emits an 'error' (e.g. ENOENT for a missing CLI)
 */
function fakeChild(outcome: {
  code?: number;
  errorCode?: string;
  stderr?: string;
  stdout?: string;
}) {
  const child = new EventEmitter() as EventEmitter & {
    stderr: EventEmitter;
    stdin: { end: jest.Mock; on: jest.Mock; write: jest.Mock };
    stdout: EventEmitter;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = {
    end: jest.fn(() => {
      // Emit the outcome asynchronously once the input has been written.
      setImmediate(() => {
        if (outcome.errorCode) {
          const err = new Error('spawn failed') as NodeJS.ErrnoException;
          err.code = outcome.errorCode;
          child.emit('error', err);
          return;
        }
        if (outcome.stdout) {
          child.stdout.emit('data', Buffer.from(outcome.stdout));
        }
        if (outcome.stderr) {
          child.stderr.emit('data', Buffer.from(outcome.stderr));
        }
        child.emit('close', outcome.code ?? 0);
      });
    }),
    on: jest.fn(),
    write: jest.fn(),
  };
  return child;
}

const baseRequest: AiChatSendRequest = {
  messages: [
    { content: 'You are a Socratic guide.', role: 'system' },
    { content: 'How do I center a div?', role: 'user' },
  ],
  model: 'sonnet',
};

describe('ClaudeCodeClientFactory', () => {
  let factory: ClaudeCodeClientFactory;

  beforeEach(() => {
    factory = new ClaudeCodeClientFactory();
    spawnMock.mockReset();
  });

  it('produces a completion without an API key and maps the envelope', async () => {
    const envelope = JSON.stringify({
      is_error: false,
      result: 'What does "centering" mean to you here?',
      usage: { input_tokens: 12, output_tokens: 8 },
    });
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: envelope }) as never,
    );

    const client = factory.create('ignored-api-key');
    const response = (await client.chat.send(baseRequest)) as {
      choices: { message: { content: string } }[];
      usage: {
        completion_tokens: number;
        prompt_tokens: number;
        total_tokens: number;
      };
    };

    expect(response.choices[0].message.content).toBe(
      'What does "centering" mean to you here?',
    );
    expect(response.usage).toEqual({
      completion_tokens: 8,
      prompt_tokens: 12,
      total_tokens: 20,
    });
    // apiKey is never forwarded to the CLI.
    const [, args] = spawnMock.mock.calls[0];
    expect((args as string[]).join(' ')).not.toContain('ignored-api-key');
  });

  it('passes the selected model through to --model', async () => {
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: '{"result":"ok"}' }) as never,
    );

    await factory.create('').chat.send({ ...baseRequest, model: 'opus' });

    const [command, args] = spawnMock.mock.calls[0];
    expect(command).toBe('claude');
    expect(args).toContain('--model');
    expect((args as string[])[(args as string[]).indexOf('--model') + 1]).toBe(
      'opus',
    );
  });

  it('omits --model when no model is selected (CLI default)', async () => {
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: '{"result":"ok"}' }) as never,
    );

    await factory.create('').chat.send({ ...baseRequest, model: '' });

    const [, args] = spawnMock.mock.calls[0];
    expect(args).not.toContain('--model');
  });

  it('raises a Claude-CLI-specific error when the CLI is missing', async () => {
    spawnMock.mockReturnValue(fakeChild({ errorCode: 'ENOENT' }) as never);

    await expect(factory.create('').chat.send(baseRequest)).rejects.toThrow(
      ClaudeCliError,
    );
  });

  it('raises a non-retriable error on a non-zero exit (e.g. unauthenticated)', async () => {
    spawnMock.mockReturnValue(
      fakeChild({
        code: 1,
        stderr: 'Invalid API key / not logged in',
      }) as never,
    );

    await expect(
      factory.create('').chat.send(baseRequest),
    ).rejects.toMatchObject({ code: 'CLAUDE_CLI_ERROR', retriable: false });
  });
});
