import { spawn } from 'child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';
import type { LocalCliAdapter } from '../../types/local-cli-adapter.interface';

import { SOCRATIC_QUESTION_FORMAT } from '../../types/ai-response-format.interface';
import { LocalCliError } from '../../types/local-cli-adapter.interface';
import {
  CODEX_CLI_ERROR_CODE,
  CodexCliAdapter,
  type CommandResult,
  HARDENED_FLAGS,
  parseModelCatalogue,
  readTopLevelModel,
} from '../adapters/codex-cli.adapter';
import { LocalCliClientFactory } from '../local-cli-client.factory';
import { fakeChild } from './fake-child';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

/** Real output captured from codex-cli 0.163.0 (see fixtures/codex). */
function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'codex', name), 'utf8');
}

/**
 * The adapter for the OpenAI Codex CLI (`codex exec`).
 *
 * @remarks
 * Every expectation here encodes something measured against codex-cli 0.163.0
 * (add-codex-cli-provider design.md): the base prompt is replaced through a
 * per-request instructions file that never reaches argv, the hardened flags
 * are exactly the set the boot check validates, the JSONL stream carries
 * warnings that are not failures, and the model list comes from Codex's own
 * catalogue with hidden entries dropped.
 */
describe('CodexCliAdapter', () => {
  let root: string;
  let workspaceDir: string;
  let codexHome: string;

  const socraticRequest: AiChatSendRequest = {
    messages: [
      { content: 'You are Mukti. Only ask questions.', role: 'system' },
      { content: 'What is a closure in JavaScript?', role: 'user' },
    ],
    model: 'gpt-5.6-luna',
    responseFormat: SOCRATIC_QUESTION_FORMAT,
  };

  const analyticalRequest: AiChatSendRequest = {
    messages: [
      { content: 'Return JSON with a concepts array.', role: 'system' },
      { content: 'Extract the concepts now.', role: 'user' },
    ],
    model: 'gpt-5.6-luna',
    responseFormat: undefined,
  };

  function adapter(
    overrides: Partial<ConstructorParameters<typeof CodexCliAdapter>[0]> = {},
  ): CodexCliAdapter {
    return new CodexCliAdapter({
      codexHome,
      runModelListing: () =>
        Promise.resolve({
          exitCode: 0,
          stderr: '',
          stdout: fixture('models.json'),
        }),
      runSelfCheck: () =>
        Promise.resolve({
          exitCode: 1,
          stderr:
            'Error: failed to read model instructions file /x/self-check-absent.md: No such file or directory (os error 2)\n',
          stdout: '',
        }),
      workspaceDir,
      ...overrides,
    });
  }

  function instructionsPath(args: readonly string[]): string {
    const setting = args.find((a) => a.startsWith('model_instructions_file='))!;
    return JSON.parse(setting.slice('model_instructions_file='.length));
  }

  function instructionFiles(): string[] {
    const dir = join(workspaceDir, '.mukti-codex');
    return existsSync(dir) ? readdirSync(dir) : [];
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mukti-codex-spec-'));
    workspaceDir = join(root, 'workspace');
    codexHome = join(root, 'codex-home');
    mkdirSync(codexHome);
    spawnMock.mockReset();
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  describe('identity', () => {
    it('is the codex provider, named after its command', () => {
      const a = adapter();

      expect(a.providerId).toBe('codex');
      expect(a.binary).toBe('codex');
      expect(a.errorCode).toBe(CODEX_CLI_ERROR_CODE);
      // Stdin, the default: the prompt never becomes an argument.
      expect((a as LocalCliAdapter).inputChannel).toBeUndefined();
      expect(a.timeoutMs).toBe(120_000);
      expect(a.signInHint).toContain('codex login');
    });
  });

  describe('buildArgs', () => {
    it('runs exec with every hardened flag, in the validated order', () => {
      const args = adapter().buildArgs(socraticRequest);

      expect(args.slice(0, HARDENED_FLAGS.length)).toEqual(HARDENED_FLAGS);
      expect(args[0]).toBe('exec');
    });

    it('disables every tool and context layer that was measured to leak', () => {
      const args = adapter().buildArgs(socraticRequest);
      const disabled = args
        .map((a, i) => (a === '--disable' ? args[i + 1] : undefined))
        .filter(Boolean);

      for (const feature of [
        'shell_tool',
        'unified_exec',
        'code_mode_host',
        'multi_agent',
        'hooks',
        'plugins',
        'apps',
        'browser_use',
        'computer_use',
        'view_image',
        'image_generation',
      ]) {
        expect(disabled).toContain(feature);
      }
      for (const setting of [
        'include_permissions_instructions=false',
        'include_environment_context=false',
        'include_collaboration_mode_instructions=false',
        'skills.include_instructions=false',
        'project_doc_max_bytes=0',
        'web_search="disabled"',
      ]) {
        expect(args).toContain(setting);
      }
      for (const flag of [
        '--ephemeral',
        '--ignore-user-config',
        '--ignore-rules',
        '--strict-config',
      ]) {
        expect(args).toContain(flag);
      }
      expect(args[args.indexOf('--sandbox') + 1]).toBe('read-only');
    });

    it('never passes a flag that widens access or approves actions', () => {
      const joined = adapter().buildArgs(socraticRequest).join(' ');

      for (const forbidden of [
        '--dangerously-bypass-approvals-and-sandbox',
        '--dangerously-bypass-hook-trust',
        '--approve-for-me',
        '--full-auto',
        '--add-dir',
        'workspace-write',
        'danger-full-access',
        '--output-schema',
      ]) {
        expect(joined).not.toContain(forbidden);
      }
    });

    it('runs from the workspace and reads the prompt from stdin', () => {
      const args = adapter().buildArgs(socraticRequest);

      expect(args[args.indexOf('--cd') + 1]).toBe(workspaceDir);
      expect(args[args.length - 1]).toBe('-');
    });

    it('passes the model only when one is selected', () => {
      const a = adapter();

      const withModel = a.buildArgs(socraticRequest);
      expect(withModel[withModel.indexOf('-m') + 1]).toBe('gpt-5.6-luna');

      expect(a.buildArgs({ ...socraticRequest, model: '  ' })).not.toContain(
        '-m',
      );
    });

    it('keeps the conversation and the system prompt off the command line', () => {
      const joined = adapter().buildArgs(socraticRequest).join('\n');

      expect(joined).not.toContain('closure');
      expect(joined).not.toContain('Only ask questions');
    });

    it('writes the system prompt to a private, per-request instructions file', () => {
      const a = adapter();

      const first = instructionsPath(a.buildArgs(socraticRequest));
      const second = instructionsPath(a.buildArgs(analyticalRequest));

      expect(first).not.toBe(second);
      expect(first.startsWith(join(workspaceDir, '.mukti-codex'))).toBe(true);
      expect(readFileSync(first, 'utf8')).toBe(
        'You are Mukti. Only ask questions.',
      );
      expect(readFileSync(second, 'utf8')).toBe(
        'Return JSON with a concepts array.',
      );
      expect(statSync(first).mode & 0o777).toBe(0o600);
    });

    it('joins several system messages, as the Claude adapter does', () => {
      const path = instructionsPath(
        adapter().buildArgs({
          ...socraticRequest,
          messages: [
            { content: 'First rule.', role: 'system' },
            { content: 'Second rule.', role: 'system' },
            { content: 'Hi', role: 'user' },
          ],
        }),
      );

      expect(readFileSync(path, 'utf8')).toBe('First rule.\n\nSecond rule.');
    });

    // Without a replacement Codex falls back to its own coding-agent prompt.
    it('writes a neutral instruction when there is no system message', () => {
      const path = instructionsPath(
        adapter().buildArgs({
          ...socraticRequest,
          messages: [{ content: 'Hi', role: 'user' }],
        }),
      );

      expect(readFileSync(path, 'utf8').trim().length).toBeGreaterThan(0);
      expect(readFileSync(path, 'utf8')).not.toMatch(/codex/i);
    });

    it('quotes the instructions path so unusual characters survive', () => {
      workspaceDir = join(root, 'a "quoted" \\ dir');
      const args = adapter().buildArgs(socraticRequest);

      expect(existsSync(instructionsPath(args))).toBe(true);
    });

    it('ignores a declared response format: no schema is forced', () => {
      const a = adapter();
      const declared = a.buildArgs(socraticRequest);
      const undeclared = a.buildArgs(analyticalRequest);
      const strip = (args: string[]) =>
        args.filter((x) => !x.startsWith('model_instructions_file='));

      expect(strip(declared)).toEqual(strip(undeclared));
    });
  });

  describe('afterRun', () => {
    it('removes the request instructions file', () => {
      const a = adapter();
      const args = a.buildArgs(socraticRequest);
      expect(existsSync(instructionsPath(args))).toBe(true);

      a.afterRun(args);

      expect(existsSync(instructionsPath(args))).toBe(false);
    });

    it('tolerates a file that is already gone, or arguments without one', () => {
      const a = adapter();
      const args = a.buildArgs(socraticRequest);
      a.afterRun(args);

      expect(() => a.afterRun(args)).not.toThrow();
      expect(() => a.afterRun(['exec', '-'])).not.toThrow();
    });
  });

  describe('spawnOptions', () => {
    it('recreates a missing workspace rather than failing as if codex were missing', () => {
      const a = adapter();
      expect(existsSync(workspaceDir)).toBe(false);

      expect(a.spawnOptions().cwd).toBe(realpathSync(workspaceDir));
    });
  });

  describe('parseEnvelope', () => {
    it('maps a real successful stream, ignoring its warning item', () => {
      expect(adapter().parseEnvelope(fixture('success.jsonl'))).toEqual({
        completionTokens: 29,
        content:
          'How might a function remember and access variables from the scope where it was created, even after that outer function has finished running?',
        promptTokens: 2361,
      });
    });

    it('takes the last agent message when progress messages precede it', () => {
      const stdout = [
        '{"type":"turn.started"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"Thinking about it."}}',
        '{"type":"error","message":"Reconnecting... 1/5 (stream disconnected)"}',
        '{"type":"item.completed","item":{"type":"agent_message","text":"What do you already know?"}}',
        '{"type":"turn.completed","usage":{"input_tokens":10,"cached_input_tokens":8,"output_tokens":4,"reasoning_output_tokens":3}}',
      ].join('\n');

      expect(adapter().parseEnvelope(stdout)).toEqual({
        completionTokens: 4,
        content: 'What do you already know?',
        promptTokens: 10,
      });
    });

    it('skips lines that are not JSON', () => {
      const stdout = `warning: something\n${fixture('success.jsonl')}\n`;

      expect(adapter().parseEnvelope(stdout).promptTokens).toBe(2361);
    });

    it('fails on a failed turn, naming the API reason', () => {
      const parse = () =>
        adapter().parseEnvelope(fixture('unknown-model.jsonl'));

      expect(parse).toThrow(LocalCliError);
      expect(parse).toThrow(
        "The 'no-such-model' model is not supported when using Codex with a ChatGPT account.",
      );
    });

    it('fails when there is no completed turn', () => {
      expect(() =>
        adapter().parseEnvelope(
          '{"type":"thread.started"}\n{"type":"turn.started"}\n',
        ),
      ).toThrow(/completed turn/);
    });

    it('returns empty content for a completed turn with no message, so the factory rejects it', () => {
      expect(
        adapter().parseEnvelope(
          '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":0}}',
        ).content,
      ).toBe('');
    });
  });

  describe('describeFailure', () => {
    it('unwraps the nested API message of a failed turn', () => {
      expect(adapter().describeFailure(fixture('unknown-model.jsonl'))).toBe(
        "The 'no-such-model' model is not supported when using Codex with a ChatGPT account.",
      );
    });

    it('reports the authentication failure of a signed-out run', () => {
      expect(adapter().describeFailure(fixture('signed-out.jsonl'))).toMatch(
        /^unexpected status 401 Unauthorized/,
      );
    });

    it('falls back to the last error event when no turn failed', () => {
      expect(
        adapter().describeFailure(
          '{"type":"error","message":"first"}\n{"type":"error","message":"second"}',
        ),
      ).toBe('second');
    });

    it('leaves it to stderr when the stream has no failure at all', () => {
      expect(adapter().describeFailure('')).toBeUndefined();
      expect(adapter().describeFailure('not json')).toBeUndefined();
    });
  });

  describe('through the shared factory', () => {
    it('completes a turn, writing the transcript to stdin and cleaning up', async () => {
      const a = adapter();
      const child = fakeChild({ code: 0, stdout: fixture('success.jsonl') });
      spawnMock.mockReturnValue(child as never);

      const response = (await new LocalCliClientFactory(a)
        .create('ignored-api-key')
        .chat.send(socraticRequest)) as {
        choices: { message: { content: string } }[];
        usage: { prompt_tokens: number; total_tokens: number };
      };

      expect(response.choices[0].message.content).toMatch(/\?$/);
      expect(response.usage).toMatchObject({
        prompt_tokens: 2361,
        total_tokens: 2390,
      });
      const [command, args, options] = spawnMock.mock.calls[0];
      expect(command).toBe('codex');
      expect((args as string[]).join(' ')).not.toContain('ignored-api-key');
      expect(options).toMatchObject({ cwd: realpathSync(workspaceDir) });
      expect(child.stdin.write).toHaveBeenCalledWith(
        'User: What is a closure in JavaScript?',
      );
      expect(instructionFiles()).toEqual([]);
    });

    it('sends a kickoff turn for a system-prompt-only request', async () => {
      const child = fakeChild({ code: 0, stdout: fixture('success.jsonl') });
      spawnMock.mockReturnValue(child as never);

      await new LocalCliClientFactory(adapter()).create('').chat.send({
        messages: [{ content: 'Open with a question.', role: 'system' }],
        model: 'gpt-5.6-luna',
        responseFormat: undefined,
      });

      const written = child.stdin.write.mock.calls[0][0] as string;
      expect(written.trim().length).toBeGreaterThan(0);
    });

    it('reports a signed-out run with its reason and the sign-in step', async () => {
      spawnMock.mockReturnValue(
        fakeChild({ code: 1, stdout: fixture('signed-out.jsonl') }) as never,
      );

      const failure = new LocalCliClientFactory(adapter())
        .create('')
        .chat.send(socraticRequest);

      await expect(failure).rejects.toMatchObject({
        code: CODEX_CLI_ERROR_CODE,
        retriable: false,
      });
      await expect(failure).rejects.toThrow(/codex login/);
      await expect(failure).rejects.toThrow(/401 Unauthorized/);
      expect(instructionFiles()).toEqual([]);
    });

    it('cleans up the instructions file when the run times out', async () => {
      const a = adapter();
      Object.defineProperty(a, 'timeoutMs', { value: 20 });
      spawnMock.mockReturnValue(fakeChild({ hang: true }) as never);

      await expect(
        new LocalCliClientFactory(a).create('').chat.send(socraticRequest),
      ).rejects.toThrow(/did not respond/);
      expect(instructionFiles()).toEqual([]);
    });

    it('names codex when the binary is missing', async () => {
      spawnMock.mockReturnValue(fakeChild({ errorCode: 'ENOENT' }) as never);

      await expect(
        new LocalCliClientFactory(adapter())
          .create('')
          .chat.send(socraticRequest),
      ).rejects.toThrow(/`codex` CLI was not found on PATH/);
      expect(instructionFiles()).toEqual([]);
    });
  });

  describe('warm', () => {
    it('validates the exact hardened flag set before listing models', async () => {
      const runSelfCheck = jest.fn<Promise<CommandResult>, [readonly string[]]>(
        () =>
          Promise.resolve({
            exitCode: 1,
            stderr:
              'Error: failed to read model instructions file /x: No such file or directory (os error 2)',
            stdout: '',
          }),
      );
      const a = adapter({ runSelfCheck });

      await a.warm();

      const args = runSelfCheck.mock.calls[0][0];
      expect(args.slice(0, HARDENED_FLAGS.length)).toEqual(HARDENED_FLAGS);
      expect(args[args.length - 1]).toBe('-');
      // The file it points at must not exist, or the check would run a model.
      expect(existsSync(instructionsPath(args))).toBe(false);
    });

    it.each([
      [
        'an unknown configuration key',
        'Error loading config.toml: unknown configuration field `include_environment_context` in -c/--config override',
        /unknown configuration field `include_environment_context`/,
      ],
      [
        'an unknown feature',
        'Error: Unknown feature flag: shell_tool',
        /Unknown feature flag: shell_tool/,
      ],
      ['no recognisable output', '', /no output/],
    ])(
      'fails startup on %s, quoting Codex',
      async (_label, stderr, expected) => {
        const a = adapter({
          runSelfCheck: () =>
            Promise.resolve({ exitCode: 1, stderr, stdout: '' }),
        });

        await expect(a.warm()).rejects.toThrow(LocalCliError);
        await expect(a.warm()).rejects.toThrow(expected);
      },
    );

    it('fails startup with the install hint when codex is not installed', async () => {
      const a = adapter({
        runSelfCheck: () =>
          Promise.resolve({
            exitCode: null,
            spawnErrorCode: 'ENOENT',
            stderr: 'spawn codex ENOENT',
            stdout: '',
          }),
      });

      await expect(a.warm()).rejects.toThrow(/not found on PATH/);
    });

    it('serves the listed models in Codex priority order, hiding hidden ones', async () => {
      const a = adapter();
      await a.warm();

      expect(a.getModels().map((m) => m.id)).toEqual([
        'gpt-6.1-sol',
        'gpt-6-astra',
        'gpt-6-sol',
        'gpt-6-luna',
        'gpt-5.6-sol',
        'gpt-5.6-terra',
        'gpt-5.6-luna',
      ]);
      expect(a.getModels()[0]).toEqual({
        id: 'gpt-6.1-sol',
        label: 'GPT-6.1-Sol',
      });
    });

    it("offers the user's own Codex default first", async () => {
      writeFileSync(
        join(codexHome, 'config.toml'),
        'model = "gpt-5.6-luna"\nmodel_reasoning_effort = "low"\n',
      );
      const a = adapter();
      await a.warm();

      expect(
        a
          .getModels()
          .map((m) => m.id)
          .slice(0, 2),
      ).toEqual(['gpt-5.6-luna', 'gpt-6.1-sol']);
      expect(a.getModels()).toHaveLength(7);
    });

    it('ignores a configured default that Codex does not list', async () => {
      writeFileSync(join(codexHome, 'config.toml'), 'model = "gpt-reserve"\n');
      const a = adapter();
      await a.warm();

      expect(a.getModels()[0].id).toBe('gpt-6.1-sol');
    });

    it('fails startup when the model listing fails', async () => {
      const a = adapter({
        runModelListing: () =>
          Promise.resolve({ exitCode: 2, stderr: 'boom', stdout: '' }),
      });

      await expect(a.warm()).rejects.toThrow(/exited with code 2/);
    });

    it('fails startup when Codex lists no models', async () => {
      const a = adapter({
        runModelListing: () =>
          Promise.resolve({
            exitCode: 0,
            stderr: '',
            stdout: '{"models":[{"slug":"x","visibility":"hide"}]}',
          }),
      });

      await expect(a.warm()).rejects.toThrow(/listed no models/);
    });

    it('lists models once, but checks the flags on every warm', async () => {
      const runModelListing = jest.fn(() =>
        Promise.resolve({
          exitCode: 0,
          stderr: '',
          stdout: fixture('models.json'),
        }),
      );
      const a = adapter({ runModelListing });

      await a.warm();
      await a.warm();

      expect(runModelListing).toHaveBeenCalledTimes(1);
    });

    it('refuses to serve models before warm', () => {
      expect(() => adapter().getModels()).toThrow(/has not been loaded/);
    });
  });

  describe('parseModelCatalogue', () => {
    it('returns nothing for output it does not recognise', () => {
      expect(parseModelCatalogue('not json')).toEqual([]);
      expect(parseModelCatalogue('{"models":"nope"}')).toEqual([]);
      expect(parseModelCatalogue('[]')).toEqual([]);
    });

    it('skips malformed entries and falls back to the slug as label', () => {
      expect(
        parseModelCatalogue(
          JSON.stringify({
            models: [
              { priority: 2, slug: 'b', visibility: 'list' },
              { priority: 0, slug: 'has space', visibility: 'list' },
              { priority: 0, visibility: 'list' },
              'garbage',
              { display_name: 'A', priority: 1, slug: 'a', visibility: 'list' },
            ],
          }),
        ),
      ).toEqual([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'b' },
      ]);
    });
  });

  describe('readTopLevelModel', () => {
    it('reads the top-level model key', () => {
      expect(readTopLevelModel('model = "gpt-6.1-sol"\n')).toBe('gpt-6.1-sol');
      expect(readTopLevelModel("model='x' # comment")).toBe('x');
    });

    it('ignores the same key inside a table, and other keys', () => {
      expect(
        readTopLevelModel('[profiles.fast]\nmodel = "gpt-5.6-luna"\n'),
      ).toBeUndefined();
      expect(
        readTopLevelModel(
          'model_reasoning_effort = "low"\nreview_model = "y"\n',
        ),
      ).toBeUndefined();
    });
  });
});
