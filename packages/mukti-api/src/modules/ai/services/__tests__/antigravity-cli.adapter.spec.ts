import { spawn } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';
import type { AiJsonSchemaResponseFormat } from '../../types/ai-response-format.interface';

import { SOCRATIC_QUESTION_FORMAT } from '../../types/ai-response-format.interface';
import { LocalCliError } from '../../types/local-cli-adapter.interface';
import {
  ANTIGRAVITY_CLI_ERROR_CODE,
  AntigravityCliAdapter,
  type ModelListingResult,
} from '../adapters/antigravity-cli.adapter';
import { LocalCliClientFactory } from '../local-cli-client.factory';
import { fakeChild } from './fake-child';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

/**
 * The adapter for the Antigravity CLI (`agy`).
 *
 * @remarks
 * Every expectation here encodes something measured against agy v1.1.22
 * (design.md Decision 12), not a preference: the prompt only travels as the
 * `--print` value, the declared schema is honoured and unwrapped, a missing
 * `finish` instruction doubles the cost, and an unknown `--project` name is
 * silently ignored — which is why project scoping is resolved from agy's own
 * project records rather than by name.
 */
describe('AntigravityCliAdapter', () => {
  let root: string;
  let workspaceDir: string;
  let projectsDir: string;

  const socraticRequest: AiChatSendRequest = {
    messages: [
      { content: 'You are Mukti. Only ask questions.', role: 'system' },
      { content: 'What is a closure in JavaScript?', role: 'user' },
    ],
    model: 'gemini-3.8-flash-high',
    responseFormat: SOCRATIC_QUESTION_FORMAT,
  };

  const analyticalRequest: AiChatSendRequest = {
    messages: [
      { content: 'Return JSON with a concepts array.', role: 'system' },
      { content: 'Extract the concepts now.', role: 'user' },
    ],
    model: 'gemini-3.8-flash-high',
    responseFormat: undefined,
  };

  const MODEL_LISTING =
    'gemini-3.8-flash-high\tGemini 3.8 Flash (High)\n' +
    'claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)\n' +
    '\n';

  function listing(
    result: Partial<ModelListingResult> = {},
  ): jest.Mock<Promise<ModelListingResult>, []> {
    return jest.fn(() =>
      Promise.resolve({
        exitCode: 0,
        stderr: 'Fetching available models...\n',
        stdout: MODEL_LISTING,
        ...result,
      }),
    );
  }

  function adapter(runModelListing = listing()): AntigravityCliAdapter {
    return new AntigravityCliAdapter({
      projectsDir,
      runModelListing,
      workspaceDir,
    });
  }

  function writeProject(id: string, folder: string): void {
    mkdirSync(projectsDir, { recursive: true });
    writeFileSync(
      join(projectsDir, `${id}.json`),
      JSON.stringify({
        id,
        name: 'mukti-socratic',
        projectResources: {
          resources: [{ folderUri: pathToFileURL(folder).href }],
        },
      }),
    );
  }

  /** The value of `flag` in `args`, or `undefined` when absent. */
  function flagValue(args: string[], flag: string): string | undefined {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mukti-agy-spec-'));
    workspaceDir = join(root, 'mukti-socratic');
    projectsDir = join(root, 'agy-config', 'projects');
    mkdirSync(projectsDir, { recursive: true });
    spawnMock.mockReset();
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  describe('identity', () => {
    it('drives the agy binary as the antigravity provider, taking its prompt as an argument', () => {
      const agy = adapter();

      expect(agy.binary).toBe('agy');
      expect(agy.providerId).toBe('antigravity');
      expect(agy.errorCode).toBe(ANTIGRAVITY_CLI_ERROR_CODE);
      expect(agy.inputChannel).toBe('argument');
    });

    it('stops an invocation that outlives its own print timeout', () => {
      expect(adapter().timeoutMs).toBeGreaterThan(120_000);
    });
  });

  describe('input', () => {
    it('leads with the system prompt, then the tool instruction, then the transcript', () => {
      const input = adapter().renderInput(socraticRequest);

      const system = input.indexOf('You are Mukti. Only ask questions.');
      const instruction = input.indexOf('finish tool');
      const separator = input.indexOf('\n---\n');
      const turn = input.indexOf('User: What is a closure in JavaScript?');

      expect(system).toBe(0);
      expect(instruction).toBeGreaterThan(system);
      expect(separator).toBeGreaterThan(instruction);
      expect(turn).toBeGreaterThan(separator);
    });

    // Without the finish instruction agy injects a second user turn and runs a
    // second model call: ~30k tokens instead of ~15k.
    it('asks for an immediate finish call, and no other tool, when a shape is declared', () => {
      const input = adapter().renderInput(socraticRequest);

      expect(input).toMatch(
        /call(ing)? the finish tool exactly once, immediately/,
      );
      expect(input).toMatch(/Do not call any other tool/);
    });

    it('asks for a direct reply, with no tools at all, when no shape is declared', () => {
      const input = adapter().renderInput(analyticalRequest);

      expect(input).not.toMatch(/finish tool/);
      expect(input).toMatch(/Reply immediately with only the requested output/);
      expect(input).toMatch(/Do not call any tools/);
    });

    it('supplies a kickoff turn when the request carries only a system prompt', () => {
      const input = adapter().renderInput({
        ...socraticRequest,
        messages: [
          { content: 'Generate the opening question.', role: 'system' },
        ],
      });

      expect(input).toMatch(/User: Begin\.$/);
    });

    it('keeps an answer that begins with "/" as message text', () => {
      const input = adapter().renderInput({
        ...socraticRequest,
        messages: [
          ...socraticRequest.messages,
          { content: '/research closures', role: 'user' },
        ],
      });

      expect(input.startsWith('/')).toBe(false);
      expect(input).toContain('User: /research closures');
    });
  });

  describe('arguments', () => {
    it('passes the rendered input as the --print value, last', () => {
      const args = adapter().buildArgs(socraticRequest, 'THE INPUT');

      expect(args[args.length - 1]).toBe('--print=THE INPUT');
    });

    it('keeps input that looks like a flag inside the --print value', () => {
      const args = adapter().buildArgs(
        socraticRequest,
        '--dangerously-skip-permissions',
      );

      expect(args).not.toContain('--dangerously-skip-permissions');
      expect(args).toContain('--print=--dangerously-skip-permissions');
    });

    it('requests JSON output, the sandbox, disabled slash commands and a print timeout', () => {
      const args = adapter().buildArgs(socraticRequest, 'x');

      expect(flagValue(args, '--output-format')).toBe('json');
      expect(args).toContain('--sandbox');
      expect(args).toContain('--disable-slash-commands');
      expect(flagValue(args, '--print-timeout')).toBe('120s');
    });

    // --mode plan is inert alongside --disable-slash-commands and warns on
    // stderr; auto-approving permissions is never acceptable.
    it('never passes --mode or a permission-skipping flag', () => {
      const args = adapter().buildArgs(socraticRequest, 'x');

      expect(args).not.toContain('--mode');
      expect(args.join(' ')).not.toMatch(/plan|dangerously/);
    });

    it('passes the declared schema inline as a JSON string, not a file path', () => {
      const args = adapter().buildArgs(socraticRequest, 'x');
      const schema = flagValue(args, '--json-schema');

      expect(schema).toBeDefined();
      expect(JSON.parse(schema!)).toEqual(
        SOCRATIC_QUESTION_FORMAT.jsonSchema.schema,
      );
      expect(existsSync(schema!)).toBe(false);
    });

    it('passes no schema when the caller declared none', () => {
      const args = adapter().buildArgs(analyticalRequest, 'x');

      expect(args).not.toContain('--json-schema');
    });

    it('passes the selected model, and omits the flag when none is selected', () => {
      const agy = adapter();

      expect(flagValue(agy.buildArgs(socraticRequest, 'x'), '--model')).toBe(
        'gemini-3.8-flash-high',
      );
      expect(
        agy.buildArgs({ ...socraticRequest, model: ' ' }, 'x'),
      ).not.toContain('--model');
    });

    // Linux caps a single argument at 128 KB; failing inside spawn would read as
    // a missing CLI.
    it('refuses input too large to pass as one argument', () => {
      expect(() =>
        adapter().buildArgs(socraticRequest, 'x'.repeat(100_001)),
      ).toThrow(LocalCliError);
      expect(() =>
        adapter().buildArgs(socraticRequest, 'x'.repeat(100_001)),
      ).toThrow(/too long/);
    });
  });

  describe('workspace and project', () => {
    it('runs agy from its own directory, creating it on demand', () => {
      const { cwd } = adapter().spawnOptions();

      expect(cwd).toBe(realpathSync(workspaceDir));
      expect(existsSync(workspaceDir)).toBe(true);
    });

    it('writes nothing into the workspace or agy configuration to build an invocation', () => {
      const agy = adapter();
      agy.spawnOptions();
      const before = readdirSync(projectsDir);

      agy.buildArgs(socraticRequest, 'x');

      expect(readdirSync(workspaceDir)).toEqual([]);
      expect(readdirSync(projectsDir)).toEqual(before);
    });

    it('scopes the run to the existing project whose folder is the workspace', () => {
      const agy = adapter();
      writeProject('other-project', join(root, 'elsewhere'));
      writeProject('mukti-project-id', realpathSync(agy.spawnOptions().cwd));

      const args = agy.buildArgs(socraticRequest, 'x');

      expect(flagValue(args, '--project')).toBe('mukti-project-id');
      expect(args).not.toContain('--new-project');
    });

    // An unknown --project name is silently ignored by agy, so a name alone can
    // never be trusted; only a recorded project id can.
    it('creates the project once when none exists, and never again in this process', () => {
      const agy = adapter();
      writeProject('other-project', join(root, 'elsewhere'));

      const first = agy.buildArgs(socraticRequest, 'x');
      const second = agy.buildArgs(socraticRequest, 'x');

      expect(first).toContain('--new-project');
      expect(first).not.toContain('--project');
      expect(second).not.toContain('--new-project');
      expect(second).not.toContain('--project');
    });

    it('uses the project agy created on a later turn', () => {
      const agy = adapter();
      expect(agy.buildArgs(socraticRequest, 'x')).toContain('--new-project');

      writeProject('created-id', realpathSync(agy.spawnOptions().cwd));

      expect(flagValue(agy.buildArgs(socraticRequest, 'x'), '--project')).toBe(
        'created-id',
      );
    });

    it('passes no project flag when agy has no readable project directory', () => {
      rmSync(projectsDir, { force: true, recursive: true });

      const args = adapter().buildArgs(socraticRequest, 'x');

      expect(args).not.toContain('--new-project');
      expect(args).not.toContain('--project');
    });

    it('ignores unreadable project records', () => {
      writeFileSync(join(projectsDir, 'broken.json'), '{not json');

      expect(adapter().buildArgs(socraticRequest, 'x')).toContain(
        '--new-project',
      );
    });
  });

  describe('envelope', () => {
    const success = (extra: Record<string, unknown>) =>
      JSON.stringify({
        conversation_id: 'c1',
        duration_seconds: 25.8,
        num_turns: 1,
        status: 'SUCCESS',
        usage: {
          cache_read_tokens: 0,
          input_tokens: 14945,
          output_tokens: 578,
          thinking_tokens: 510,
          total_tokens: 15523,
        },
        ...extra,
      });

    it('unwraps the declared single-question structure into text and maps usage', () => {
      const completion = adapter().parseEnvelope(
        success({
          response: '{"question":"What do you already know?","toolAction":"x"}',
          structured_output: { question: 'What do you already know?' },
        }),
        socraticRequest,
      );

      expect(completion).toEqual({
        completionTokens: 578,
        content: 'What do you already know?',
        promptTokens: 14945,
      });
    });

    it('trusts the structured output over the raw response when they differ', () => {
      const completion = adapter().parseEnvelope(
        success({
          response: '{"question":"raw","toolSummary":"leaked"}',
          structured_output: { question: 'clean' },
        }),
        socraticRequest,
      );

      expect(completion.content).toBe('clean');
    });

    it('returns a multi-field declared structure as JSON text', () => {
      const format: AiJsonSchemaResponseFormat = {
        jsonSchema: {
          name: 'concept_list',
          schema: {
            properties: {
              concepts: { items: { type: 'string' }, type: 'array' },
              confidence: { type: 'number' },
            },
            type: 'object',
          },
        },
        type: 'json_schema',
      };

      const completion = adapter().parseEnvelope(
        success({
          structured_output: { concepts: ['closures'], confidence: 0.9 },
        }),
        { ...socraticRequest, responseFormat: format },
      );

      expect(JSON.parse(completion.content)).toEqual({
        concepts: ['closures'],
        confidence: 0.9,
      });
    });

    it('fails when a shape was declared but no structured output came back', () => {
      expect(() =>
        adapter().parseEnvelope(
          success({ response: 'Closures are functions that…' }),
          socraticRequest,
        ),
      ).toThrow(LocalCliError);
    });

    it('uses the raw response when no shape was declared', () => {
      const completion = adapter().parseEnvelope(
        success({
          response: '{"hasMisconception": true, "conceptName": "const"}\n',
        }),
        analyticalRequest,
      );

      expect(completion.content).toBe(
        '{"hasMisconception": true, "conceptName": "const"}',
      );
    });

    it('treats an ERROR status as a non-retriable failure carrying its reason', () => {
      const parse = () =>
        adapter().parseEnvelope(
          JSON.stringify({
            error: 'timeout waiting for response',
            response: '',
            status: 'ERROR',
          }),
          socraticRequest,
        );

      expect(parse).toThrow(/timeout waiting for response/);
      try {
        parse();
      } catch (error) {
        expect(error).toMatchObject({
          code: ANTIGRAVITY_CLI_ERROR_CODE,
          retriable: false,
        });
      }
    });

    it('treats an unrecognized status as a failure rather than success', () => {
      expect(() =>
        adapter().parseEnvelope(
          success({
            status: 'PARTIAL',
            structured_output: { question: 'Looks fine?' },
          }),
          socraticRequest,
        ),
      ).toThrow(/PARTIAL/);
    });

    it('treats unparseable output as a failure naming agy', () => {
      expect(() =>
        adapter().parseEnvelope('not json at all', socraticRequest),
      ).toThrow(/agy/);
    });

    it('describes a failure from the JSON envelope agy prints on a non-zero exit', () => {
      const agy = adapter();

      expect(
        agy.describeFailure(
          '{"status":"ERROR","error":"invalid model selection"}',
        ),
      ).toBe('invalid model selection');
      expect(agy.describeFailure('plain text')).toBeUndefined();
    });
  });

  describe('models', () => {
    it('refuses to serve a model list it has not loaded', () => {
      expect(() => adapter().getModels()).toThrow(LocalCliError);
    });

    it('lists the models agy reports, parsed from id<TAB>label lines', async () => {
      const agy = adapter();

      await agy.warm();

      expect(agy.getModels()).toEqual([
        { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
        { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Thinking)' },
      ]);
    });

    it('asks agy once and serves the cached list after that', async () => {
      const run = listing();
      const agy = adapter(run);

      await agy.warm();
      await agy.warm();
      agy.getModels();
      agy.getModels();

      expect(run).toHaveBeenCalledTimes(1);
    });

    it('surfaces a failed listing with the sign-in step instead of guessing', async () => {
      const agy = adapter(
        listing({ exitCode: 1, stderr: 'not authenticated', stdout: '' }),
      );

      await expect(agy.warm()).rejects.toThrow(/sign in/);
      expect(() => agy.getModels()).toThrow(LocalCliError);
    });

    it('surfaces an empty listing instead of guessing', async () => {
      await expect(adapter(listing({ stdout: '\n' })).warm()).rejects.toThrow(
        /no models/,
      );
    });

    // Regression: agy waits on an open stdin, so `agy models` under a default
    // pipe hung until killed and the API could not boot.
    it('lists models with stdin closed, so agy does not wait on it', async () => {
      spawnMock.mockImplementation((() => {
        const child = fakeChild({ hang: true });
        setImmediate(() => {
          child.stdout.emit('data', Buffer.from(MODEL_LISTING));
          child.emit('close', 0, null);
        });
        return child;
      }) as never);
      const agy = new AntigravityCliAdapter({ projectsDir, workspaceDir });

      await agy.warm();

      const [command, args, options] = spawnMock.mock.calls[0];
      expect(command).toBe('agy');
      expect(args).toEqual(['models']);
      expect((options as { stdio: unknown[] }).stdio[0]).toBe('ignore');
      expect(agy.getModels()).toHaveLength(2);
    });

    it('creates its workspace while warming up', async () => {
      await adapter().warm();

      expect(existsSync(workspaceDir)).toBe(true);
    });
  });

  describe('through the local CLI factory', () => {
    function factory(): LocalCliClientFactory {
      return new LocalCliClientFactory(adapter());
    }

    it('returns the unwrapped question as the assistant message, sending nothing on stdin', async () => {
      const child = fakeChild({
        code: 0,
        stdout: JSON.stringify({
          status: 'SUCCESS',
          structured_output: { question: 'What do you already know?' },
          usage: { input_tokens: 14942, output_tokens: 675 },
        }),
      });
      spawnMock.mockReturnValue(child as never);

      const response = (await factory()
        .create('ignored-key')
        .chat.send(socraticRequest)) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number };
      };

      expect(response.choices[0].message.content).toBe(
        'What do you already know?',
      );
      expect(response.usage.prompt_tokens).toBe(14942);
      expect(child.stdin.write).not.toHaveBeenCalled();
      const [command, args, options] = spawnMock.mock.calls[0];
      expect(command).toBe('agy');
      expect((args as string[]).join(' ')).not.toContain('ignored-key');
      expect((options as { cwd: string }).cwd).toBe(realpathSync(workspaceDir));
    });

    it('reports agy’s own reason when it exits non-zero with an error envelope', async () => {
      spawnMock.mockReturnValue(
        fakeChild({
          code: 1,
          stdout: JSON.stringify({
            error: 'timeout waiting for response',
            response: '',
            status: 'ERROR',
          }),
        }) as never,
      );

      await expect(
        factory().create('').chat.send(socraticRequest),
      ).rejects.toThrow(/Detail: timeout waiting for response$/);
    });

    it('treats an empty reply as a failure', async () => {
      spawnMock.mockReturnValue(
        fakeChild({
          code: 0,
          stdout: JSON.stringify({ response: '  \n', status: 'SUCCESS' }),
        }) as never,
      );

      await expect(
        factory().create('').chat.send(analyticalRequest),
      ).rejects.toMatchObject({
        code: ANTIGRAVITY_CLI_ERROR_CODE,
        retriable: false,
      });
    });
  });
});
