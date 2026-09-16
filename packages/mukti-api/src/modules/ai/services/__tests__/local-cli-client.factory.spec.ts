import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';
import type { LocalCliAdapter } from '../../types/local-cli-adapter.interface';

import { SOCRATIC_QUESTION_FORMAT } from '../../types/ai-response-format.interface';
import { ClaudeCliAdapter } from '../adapters/claude-cli.adapter';
import { LocalCliClientFactory } from '../local-cli-client.factory';

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
  responseFormat: undefined,
};

/**
 * Guards the claude-code provider's behaviour across the extraction of
 * {@link LocalCliClientFactory}. These cases predate the shared factory and are
 * preserved verbatim: if the refactor changed anything observable about
 * `claude -p`, one of them fails.
 */
describe('LocalCliClientFactory with ClaudeCliAdapter', () => {
  let factory: LocalCliClientFactory;

  beforeEach(() => {
    factory = new LocalCliClientFactory(new ClaudeCliAdapter());
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

  it('denies every built-in agentic tool', async () => {
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: '{"result":"ok"}' }) as never,
    );

    await factory.create('').chat.send(baseRequest);

    const [, args] = spawnMock.mock.calls[0];
    const denied = (args as string[])[
      (args as string[]).indexOf('--disallowed-tools') + 1
    ];
    for (const tool of ['Bash', 'Edit', 'Write', 'Read', 'Task']) {
      expect(denied).toContain(tool);
    }
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

  it('writes the conversation turns to stdin', async () => {
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: '{"result":"ok"}' }) as never,
    );

    await factory.create('').chat.send(baseRequest);

    const spawned = spawnMock.mock.results[0].value as {
      stdin: { write: jest.Mock };
    };
    expect(spawned.stdin.write).toHaveBeenCalledWith(
      'User: How do I center a div?',
    );
  });

  // Regression: the Thought Map opening question sends a system prompt with no
  // user turn. Empty stdin makes `claude -p` exit 1 with "Input must be provided
  // either through stdin or as a prompt argument when using --print".
  it('sends a kickoff turn when the request has only a system prompt', async () => {
    spawnMock.mockReturnValue(
      fakeChild({
        code: 0,
        stdout: '{"result":"An opening question?"}',
      }) as never,
    );

    const response = (await factory.create('').chat.send({
      messages: [
        { content: 'Generate the opening Socratic question.', role: 'system' },
      ],
      model: 'sonnet',
      responseFormat: undefined,
    })) as { choices: { message: { content: string } }[] };

    const spawned = spawnMock.mock.results[0].value as {
      stdin: { write: jest.Mock };
    };
    const written = spawned.stdin.write.mock.calls[0][0] as string;

    expect(written.trim().length).toBeGreaterThan(0);
    // The system prompt still carries the instruction.
    const [, args] = spawnMock.mock.calls[0];
    expect(args).toContain('--system-prompt');
    expect(response.choices[0].message.content).toBe('An opening question?');
  });

  it('raises a Claude-CLI-specific error when the CLI is missing', async () => {
    spawnMock.mockReturnValue(fakeChild({ errorCode: 'ENOENT' }) as never);

    await expect(
      factory.create('').chat.send(baseRequest),
    ).rejects.toMatchObject({ code: 'CLAUDE_CLI_ERROR', retriable: false });
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

  it('reports an unparseable envelope as a non-retriable failure', async () => {
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: 'not json at all' }) as never,
    );

    await expect(
      factory.create('').chat.send(baseRequest),
    ).rejects.toMatchObject({ code: 'CLAUDE_CLI_ERROR', retriable: false });
  });

  it('reports an error envelope as a non-retriable failure', async () => {
    spawnMock.mockReturnValue(
      fakeChild({
        code: 0,
        stdout: '{"is_error":true,"subtype":"rate_limit","result":"slow down"}',
      }) as never,
    );

    await expect(factory.create('').chat.send(baseRequest)).rejects.toThrow(
      /rate_limit/,
    );
  });

  // An empty completion is a provider failure, not a Socratic answer: returning
  // it would let a blank assistant message reach the user.
  it('treats a zero-exit empty response as a failure', async () => {
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: '{"result":"   "}' }) as never,
    );

    await expect(
      factory.create('').chat.send(baseRequest),
    ).rejects.toMatchObject({ code: 'CLAUDE_CLI_ERROR', retriable: false });
  });
});

/**
 * The response-shape contract, exercised through a stub adapter.
 *
 * @remarks
 * No shipped adapter enforces shapes yet — `claude -p` carries the Socratic
 * instruction in its system prompt and has no need to. These cases therefore
 * stand in for the provider that will: they pin the guarantee the analytical
 * surfaces depend on, so that an adapter which *does* enforce cannot quietly
 * start constraining thought-map extraction or misconception detection.
 *
 * The load-bearing case is the first one. An adapter that substitutes a shape
 * the caller did not declare breaks four surfaces at once, and does it without
 * any error the adapter itself can observe.
 */
describe('LocalCliClientFactory response-shape contract', () => {
  /** Minimal adapter that forwards a declared shape and nothing else. */
  function enforcingAdapter(): LocalCliAdapter {
    return {
      binary: 'stub-cli',
      buildArgs: (request) => {
        const declared = request.responseFormat;
        return declared
          ? ['--json-schema', JSON.stringify(declared.jsonSchema.schema)]
          : [];
      },
      errorCode: 'STUB_CLI_ERROR',
      getModels: () => [],
      installHint: 'Install the stub CLI.',
      parseEnvelope: (stdout) => ({
        completionTokens: 0,
        content: stdout.trim(),
        promptTokens: 0,
      }),
      providerId: 'antigravity',
      signInHint: 'Sign in to the stub CLI.',
    };
  }

  function argsFrom(): string[] {
    return (spawnMock.mock.calls[0][1] ?? []) as string[];
  }

  beforeEach(() => {
    spawnMock.mockReset();
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: 'A question?' }) as never,
    );
  });

  it('passes no shape-constraining option when the caller declared none', async () => {
    await new LocalCliClientFactory(enforcingAdapter())
      .create('')
      .chat.send({ ...baseRequest, responseFormat: undefined });

    expect(argsFrom()).not.toContain('--json-schema');
    expect(argsFrom()).toHaveLength(0);
  });

  it('applies exactly the declared shape, neither widened nor substituted', async () => {
    await new LocalCliClientFactory(enforcingAdapter())
      .create('')
      .chat.send({ ...baseRequest, responseFormat: SOCRATIC_QUESTION_FORMAT });

    const args = argsFrom();
    expect(args[0]).toBe('--json-schema');
    expect(JSON.parse(args[1])).toEqual(
      SOCRATIC_QUESTION_FORMAT.jsonSchema.schema,
    );
  });

  it('reaches the adapter intact when a caller declares its own schema', async () => {
    const callerSchema = {
      additionalProperties: false,
      properties: { concepts: { items: { type: 'string' }, type: 'array' } },
      type: 'object',
    };

    await new LocalCliClientFactory(enforcingAdapter()).create('').chat.send({
      ...baseRequest,
      responseFormat: {
        jsonSchema: { name: 'concept_list', schema: callerSchema },
        type: 'json_schema',
      },
    });

    expect(JSON.parse(argsFrom()[1])).toEqual(callerSchema);
  });

  it('leaves the claude-code invocation identical whether or not a shape is declared', async () => {
    const claude = new LocalCliClientFactory(new ClaudeCliAdapter());
    const envelope = '{"result":"A question?"}';

    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: envelope }) as never,
    );
    await claude
      .create('')
      .chat.send({ ...baseRequest, responseFormat: undefined });
    const withoutShape = argsFrom();

    spawnMock.mockClear();
    spawnMock.mockReturnValue(
      fakeChild({ code: 0, stdout: envelope }) as never,
    );
    await claude
      .create('')
      .chat.send({ ...baseRequest, responseFormat: SOCRATIC_QUESTION_FORMAT });

    expect(argsFrom()).toEqual(withoutShape);
  });
});
