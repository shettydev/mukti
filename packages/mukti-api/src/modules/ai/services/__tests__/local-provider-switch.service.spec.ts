import type { ConfigService } from '@nestjs/config';

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import type {
  CommandResult,
  RunCommand,
} from '../../local-cli/provider-catalog';

import { AntigravityCliAdapter } from '../adapters/antigravity-cli.adapter';
import { CodexCliAdapter } from '../adapters/codex-cli.adapter';
import { AiProviderRegistry } from '../ai-provider.registry';
import {
  LocalProviderSwitchService,
  READINESS_TTL_MS,
} from '../local-provider-switch.service';

/** Answers that make every CLI installed and signed in. */
const ALL_READY: Record<string, Partial<CommandResult>> = {
  'agy --version': { status: 0, stdout: '1.1.22\n' },
  'agy models': { status: 0, stdout: 'gemini-3.8-flash-high\tGemini\n' },
  'claude --version': { status: 0, stdout: '2.1.0 (Claude Code)\n' },
  'claude auth status': { status: 0, stdout: '{"loggedIn":true}' },
  'codex --version': { status: 0, stdout: 'codex-cli 0.163.0\n' },
  'codex login status': { status: 0, stdout: '' },
};

/** A command runner that answers from a table and records what it was asked. */
function scripted(answers: Record<string, Partial<CommandResult>>) {
  const calls: string[] = [];
  const run: RunCommand = (command, args) => {
    const key = [command, ...args].join(' ');
    calls.push(key);
    const answer = answers[key];
    return Promise.resolve(
      answer
        ? { status: 0, stderr: '', stdout: '', ...answer }
        : {
            error: new Error(`spawn ${command} ENOENT`),
            status: null,
            stderr: '',
            stdout: '',
          },
    );
  };
  return { calls, run };
}

/**
 * Switching the local AI CLI from Settings.
 *
 * @remarks
 * Every refusal must leave the previous provider active and usable, and
 * nothing may be saved as the default unless the switch itself succeeded.
 * Those two rules are what make a switch safe to offer in the UI at all.
 */
describe('LocalProviderSwitchService', () => {
  const env = { ...process.env };
  let home: string;

  function registry(provider = 'claude'): AiProviderRegistry {
    const config = {
      get: jest.fn((key: string) =>
        key === 'AI_PROVIDER' ? provider : undefined,
      ),
    } as unknown as ConfigService;
    return new AiProviderRegistry(config);
  }

  function service(
    options: {
      answers?: Record<string, Partial<CommandResult>>;
      provider?: string;
    } = {},
  ) {
    const providers = registry(options.provider);
    const runner = scripted(options.answers ?? ALL_READY);
    return {
      providers,
      runner,
      switcher: new LocalProviderSwitchService(providers, runner.run),
    };
  }

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'mukti-switch-spec-'));
    process.env.MUKTI_PROVIDER_SETTINGS = join(home, 'config.json');
    process.env.MUKTI_PROVIDER_SOURCE = 'saved';
    // Preparation is the adapters' own concern and is covered by their specs;
    // here it must simply succeed or fail on demand.
    jest.spyOn(CodexCliAdapter.prototype, 'warm').mockResolvedValue();
    jest.spyOn(AntigravityCliAdapter.prototype, 'warm').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    rmSync(home, { force: true, recursive: true });
    process.env = { ...env };
  });

  describe('readiness report', () => {
    it('reports every CLI with its readiness, version and launcher wording', async () => {
      const { switcher } = service({
        answers: {
          'claude --version': ALL_READY['claude --version'],
          'claude auth status': ALL_READY['claude auth status'],
          'codex --version': ALL_READY['codex --version'],
          'codex login status': { status: 1 },
        },
      });

      const status = await switcher.getStatus();

      expect(status.activeId).toBe('claude');
      expect(
        status.providers.map((p) => [p.id, p.readiness, p.active]),
      ).toEqual([
        ['claude', 'ready', true],
        ['codex', 'signed-out', false],
        ['agy', 'missing', false],
      ]);
      const codex = status.providers.find((p) => p.id === 'codex')!;
      expect(codex.version).toBe('codex-cli 0.163.0');
      expect(codex.signInRemediation).toBe('Run `codex login` and try again.');
      expect(codex.disclosure).toMatch(/AGENTS\.md/);
      expect(status.providers.find((p) => p.id === 'agy')!.version).toBeNull();
    });

    it('spends no tokens: only version and sign-in probes run', async () => {
      const { runner, switcher } = service();

      await switcher.getStatus();

      expect(runner.calls.sort()).toEqual(Object.keys(ALL_READY).sort());
    });

    it('does not ask a missing CLI whether it is signed in', async () => {
      const { runner, switcher } = service({
        answers: { 'claude --version': ALL_READY['claude --version'] },
      });

      await switcher.getStatus();

      expect(runner.calls).not.toContain('agy models');
      expect(runner.calls).not.toContain('codex login status');
    });

    it('reuses a recent result, and probes again once it is stale', async () => {
      jest.useFakeTimers({ now: 1_000_000 });
      const { runner, switcher } = service();

      await switcher.getStatus();
      await switcher.getStatus();
      expect(runner.calls.filter((c) => c === 'agy models')).toHaveLength(1);

      jest.setSystemTime(1_000_000 + READINESS_TTL_MS + 1);
      await switcher.getStatus();
      expect(runner.calls.filter((c) => c === 'agy models')).toHaveLength(2);
    });

    it('shares one probe between concurrent requests', async () => {
      const { runner, switcher } = service();

      await Promise.all([switcher.getStatus(), switcher.getStatus()]);

      expect(runner.calls.filter((c) => c === 'agy models')).toHaveLength(1);
    });

    it('probes again on a re-check, even with a recent result', async () => {
      const { runner, switcher } = service();

      await switcher.getStatus();
      await switcher.getStatus({ refresh: true });

      expect(runner.calls.filter((c) => c === 'agy models')).toHaveLength(2);
    });

    it('reports how the launch chose, and unknown when not told', async () => {
      const { switcher } = service();

      process.env.MUKTI_PROVIDER_SOURCE = 'option';
      expect((await switcher.getStatus()).launchSource).toBe('option');

      delete process.env.MUKTI_PROVIDER_SOURCE;
      expect((await switcher.getStatus()).launchSource).toBe('unknown');

      process.env.MUKTI_PROVIDER_SOURCE = 'nonsense';
      expect((await switcher.getStatus()).launchSource).toBe('unknown');
    });

    it('reports the saved default, under its current name', async () => {
      writeFileSync(
        join(home, 'config.json'),
        JSON.stringify({ provider: 'antigravity', version: 1 }),
      );
      const { switcher } = service();

      expect((await switcher.getStatus()).saveDefault).toEqual({
        available: true,
        savedId: 'agy',
      });
    });

    it('says saving is unavailable when the launcher did not say where the default lives', async () => {
      delete process.env.MUKTI_PROVIDER_SETTINGS;
      const { switcher } = service();

      const { saveDefault } = await switcher.getStatus();

      expect(saveDefault.available).toBe(false);
      expect(saveDefault.available === false && saveDefault.reason).toMatch(
        /launcher/,
      );
    });
  });

  describe('switching', () => {
    it('makes a ready CLI active, accepting its former name', async () => {
      const { providers, switcher } = service();

      const result = await switcher.switchTo('antigravity');

      expect(result).toEqual({ activeId: 'agy', changed: true, saved: false });
      expect(providers.getProviderId()).toBe('antigravity');
    });

    it('prepares the target before it becomes active', async () => {
      const { providers, switcher } = service();
      const warm = jest
        .spyOn(CodexCliAdapter.prototype, 'warm')
        .mockImplementation(() => {
          // Still the old provider while preparing.
          expect(providers.getProviderId()).toBe('claude-code');
          return Promise.resolve();
        });

      await switcher.switchTo('codex');

      expect(warm).toHaveBeenCalledTimes(1);
      expect(providers.getProviderId()).toBe('codex');
    });

    it('refuses a signed-out CLI with its sign-in step, and keeps the current one', async () => {
      const { providers, switcher } = service({
        answers: { ...ALL_READY, 'codex login status': { status: 1 } },
      });

      await expect(switcher.switchTo('codex')).rejects.toMatchObject({
        response: {
          error: {
            code: 'PROVIDER_NOT_READY',
            message: expect.stringContaining('codex login'),
          },
        },
        status: 409,
      });
      expect(providers.getProviderId()).toBe('claude-code');
    });

    it('refuses a CLI that is not installed with its install step', async () => {
      const { 'agy --version': _v, 'agy models': _m, ...noAgy } = ALL_READY;
      const { providers, switcher } = service({ answers: noAgy });

      await expect(switcher.switchTo('agy')).rejects.toMatchObject({
        response: {
          error: {
            code: 'PROVIDER_NOT_READY',
            message: expect.stringContaining('antigravity.google'),
          },
        },
      });
      expect(providers.getProviderId()).toBe('claude-code');
    });

    it('re-probes a CLI last seen signed out, since signing in is why people switch', async () => {
      const answers = { ...ALL_READY, 'codex login status': { status: 1 } };
      const { providers, switcher } = service({ answers });

      await switcher.getStatus();
      answers['codex login status'] = { status: 0 };
      await switcher.switchTo('codex');

      expect(providers.getProviderId()).toBe('codex');
    });

    it('trusts a recent ready result instead of probing again', async () => {
      const { runner, switcher } = service();

      await switcher.getStatus();
      const before = runner.calls.length;
      await switcher.switchTo('agy');

      expect(runner.calls.length).toBe(before);
    });

    it('keeps the current provider when preparation fails, and says why', async () => {
      jest
        .spyOn(CodexCliAdapter.prototype, 'warm')
        .mockRejectedValue(new Error('unknown configuration field `x`'));
      const { providers, switcher } = service();

      await expect(switcher.switchTo('codex')).rejects.toMatchObject({
        response: {
          error: {
            code: 'PROVIDER_WARM_FAILED',
            message: expect.stringContaining('unknown configuration field'),
          },
        },
        status: 409,
      });
      expect(providers.getProviderId()).toBe('claude-code');
    });

    it('does nothing, and runs no probe, for the provider already active', async () => {
      const { runner, switcher } = service();

      const result = await switcher.switchTo('claude');

      expect(result).toEqual({
        activeId: 'claude',
        changed: false,
        saved: false,
      });
      expect(runner.calls).toEqual([]);
    });

    it('refuses a second switch while one is running', async () => {
      let finishWarm!: () => void;
      jest.spyOn(AntigravityCliAdapter.prototype, 'warm').mockReturnValue(
        new Promise<void>((resolve) => {
          finishWarm = resolve;
        }),
      );
      const { providers, switcher } = service();

      const first = switcher.switchTo('agy');
      await new Promise((resolve) => setImmediate(resolve));
      await expect(switcher.switchTo('codex')).rejects.toMatchObject({
        response: { error: { code: 'PROVIDER_SWITCH_IN_PROGRESS' } },
        status: 409,
      });

      finishWarm();
      await first;
      expect(providers.getProviderId()).toBe('antigravity');
    });

    it('allows another switch once the previous one failed', async () => {
      jest
        .spyOn(CodexCliAdapter.prototype, 'warm')
        .mockRejectedValueOnce(new Error('boom'));
      const { providers, switcher } = service();

      await expect(switcher.switchTo('codex')).rejects.toBeDefined();
      await switcher.switchTo('codex');

      expect(providers.getProviderId()).toBe('codex');
    });

    it.each(['openrouter', 'gemini-cli', 'codex; rm -rf ~', '$(touch x)'])(
      'rejects %j as unsupported without starting any process',
      async (id) => {
        const { providers, runner, switcher } = service();

        await expect(switcher.switchTo(id)).rejects.toMatchObject({
          response: { error: { code: 'UNSUPPORTED_PROVIDER' } },
          status: 400,
        });
        expect(runner.calls).toEqual([]);
        expect(providers.getProviderId()).toBe('claude-code');
      },
    );

    it('refuses to switch a hosted deployment', async () => {
      const { providers, runner, switcher } = service({
        provider: 'openrouter',
      });

      await expect(switcher.switchTo('codex')).rejects.toMatchObject({
        response: { error: { code: 'PROVIDER_SWITCH_UNAVAILABLE' } },
      });
      expect(runner.calls).toEqual([]);
      expect(providers.getProviderId()).toBe('openrouter');
    });
  });

  describe('saving the switch as the default', () => {
    const file = () => join(home, 'config.json');
    const saved = () =>
      JSON.parse(readFileSync(file(), 'utf8')) as Record<string, unknown>;

    it('writes the launcher default, in the format the launcher reads', async () => {
      const { switcher } = service();

      const result = await switcher.switchTo('codex', { saveAsDefault: true });

      expect(result).toEqual({ activeId: 'codex', changed: true, saved: true });
      expect(saved()).toEqual({ provider: 'codex', version: 1 });
    });

    it('keeps settings it does not know about', async () => {
      writeFileSync(
        file(),
        JSON.stringify({ provider: 'claude', theme: 'dusk', version: 1 }),
      );
      const { switcher } = service();

      await switcher.switchTo('agy', { saveAsDefault: true });

      expect(saved()).toEqual({ provider: 'agy', theme: 'dusk', version: 1 });
    });

    it('saves nothing when the switch is refused', async () => {
      writeFileSync(file(), JSON.stringify({ provider: 'claude', version: 1 }));
      const { switcher } = service({
        answers: { ...ALL_READY, 'codex login status': { status: 1 } },
      });

      await expect(
        switcher.switchTo('codex', { saveAsDefault: true }),
      ).rejects.toBeDefined();

      expect(saved()).toEqual({ provider: 'claude', version: 1 });
    });

    it('saves the active provider as the default without switching', async () => {
      const { runner, switcher } = service();

      const result = await switcher.switchTo('claude', { saveAsDefault: true });

      expect(result).toEqual({
        activeId: 'claude',
        changed: false,
        saved: true,
      });
      expect(saved()).toEqual({ provider: 'claude', version: 1 });
      expect(runner.calls).toEqual([]);
    });

    it('still switches when the launcher did not say where the default lives', async () => {
      delete process.env.MUKTI_PROVIDER_SETTINGS;
      const { providers, switcher } = service();

      const result = await switcher.switchTo('codex', { saveAsDefault: true });

      expect(providers.getProviderId()).toBe('codex');
      expect(result.saved).toBe(false);
      expect(result.warning).toMatch(/this session only/);
    });

    it('keeps the switch, with a warning, when the file cannot be written', async () => {
      const locked = join(home, 'locked');
      mkdirSync(locked);
      chmodSync(locked, 0o500);
      process.env.MUKTI_PROVIDER_SETTINGS = join(locked, 'config.json');
      const { providers, switcher } = service();

      try {
        const result = await switcher.switchTo('codex', {
          saveAsDefault: true,
        });

        expect(providers.getProviderId()).toBe('codex');
        expect(result.saved).toBe(false);
        expect(result.warning).toMatch(/could not be written/);
      } finally {
        chmodSync(locked, 0o700);
      }
    });
  });
});
