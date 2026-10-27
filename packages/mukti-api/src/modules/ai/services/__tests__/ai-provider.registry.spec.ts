import type { ConfigService } from '@nestjs/config';

import { mkdtempSync, realpathSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { SUPPORTED_PROVIDERS } from '../../local-cli/provider-catalog';
import { AntigravityCliAdapter } from '../adapters/antigravity-cli.adapter';
import { ClaudeCliAdapter } from '../adapters/claude-cli.adapter';
import { CodexCliAdapter } from '../adapters/codex-cli.adapter';
import { AiProviderRegistry } from '../ai-provider.registry';

/**
 * Provider resolution at startup.
 *
 * @remarks
 * The registry is the one place that decides which provider serves every AI
 * surface, so the two failure modes that matter are checked here: an unknown
 * value must stop the API from booting rather than fall back to OpenRouter, and
 * a provider whose model list cannot be loaded must stop it too.
 */
describe('AiProviderRegistry', () => {
  let root: string;

  function registry(
    env: Record<string, string | undefined>,
  ): AiProviderRegistry {
    const config = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;
    return new AiProviderRegistry(config);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'mukti-registry-spec-'));
    jest.restoreAllMocks();
  });

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  it('serves openrouter, with no local adapter, when AI_PROVIDER is unset', () => {
    const r = registry({});

    expect(r.getProviderId()).toBe('openrouter');
    expect(r.getActiveLocalCliAdapter()).toBeUndefined();
    expect(r.isLocalCliProvider()).toBe(false);
  });

  it('resolves claude-code to the Claude adapter', () => {
    const r = registry({ AI_PROVIDER: 'claude-code' });

    expect(r.getActiveLocalCliAdapter()).toBeInstanceOf(ClaudeCliAdapter);
    expect(r.isLocalCliProvider()).toBe(true);
  });

  it('resolves antigravity to the Antigravity adapter', () => {
    const r = registry({ AI_PROVIDER: 'antigravity' });

    expect(r.getActiveLocalCliAdapter()).toBeInstanceOf(AntigravityCliAdapter);
    expect(r.isLocalCliProvider()).toBe(true);
  });

  it('resolves codex to the Codex adapter', () => {
    const r = registry({ AI_PROVIDER: 'codex' });

    expect(r.getProviderId()).toBe('codex');
    expect(r.getActiveLocalCliAdapter()).toBeInstanceOf(CodexCliAdapter);
    expect(r.isLocalCliProvider()).toBe(true);
  });

  // The launcher asks for these CLIs by the command they run and passes that
  // name straight through, so both spellings have to reach the same adapter.
  it.each([
    ['claude', ClaudeCliAdapter],
    ['agy', AntigravityCliAdapter],
  ])('resolves %s, the command name, to its adapter', (provider, adapter) => {
    const r = registry({ AI_PROVIDER: provider });

    expect(r.getActiveLocalCliAdapter()).toBeInstanceOf(adapter);
    expect(r.isLocalCliProvider()).toBe(true);
  });

  it('runs agy from the workspace named by MUKTI_AGY_WORKSPACE', () => {
    const workspace = join(root, 'custom-workspace');
    const adapter = registry({
      AI_PROVIDER: 'antigravity',
      MUKTI_AGY_WORKSPACE: workspace,
    }).getActiveLocalCliAdapter()!;

    expect(adapter.spawnOptions?.().cwd).toBe(realpathSync(workspace));
  });

  it.each(['antigravity', 'codex'])(
    'runs %s from the workspace named by MUKTI_CLI_WORKSPACE, which wins over the older name',
    (provider) => {
      const workspace = join(root, 'shared-workspace');
      const adapter = registry({
        AI_PROVIDER: provider,
        MUKTI_AGY_WORKSPACE: join(root, 'older-name'),
        MUKTI_CLI_WORKSPACE: workspace,
      }).getActiveLocalCliAdapter()!;

      expect(adapter.spawnOptions?.().cwd).toBe(realpathSync(workspace));
    },
  );

  it('runs codex from MUKTI_AGY_WORKSPACE when only the older name is set', () => {
    const workspace = join(root, 'older-name');
    const adapter = registry({
      AI_PROVIDER: 'codex',
      MUKTI_AGY_WORKSPACE: workspace,
      MUKTI_CLI_WORKSPACE: '  ',
    }).getActiveLocalCliAdapter()!;

    expect(adapter.spawnOptions?.().cwd).toBe(realpathSync(workspace));
  });

  it('fails startup on an unknown provider, naming every supported value, without falling back', async () => {
    const r = registry({ AI_PROVIDER: 'gemini-cli' });

    await expect(r.onModuleInit()).rejects.toThrow(
      'Unsupported AI_PROVIDER "gemini-cli". Supported values: openrouter, claude-code, antigravity, codex, agy, claude.',
    );
    expect(r.isLocalCliProvider()).toBe(false);
  });

  it('warms only the active adapter at startup', async () => {
    const warm = jest
      .spyOn(AntigravityCliAdapter.prototype, 'warm')
      .mockResolvedValue();
    const warmCodex = jest
      .spyOn(CodexCliAdapter.prototype, 'warm')
      .mockResolvedValue();

    await registry({ AI_PROVIDER: 'claude-code' }).onModuleInit();
    expect(warm).not.toHaveBeenCalled();
    expect(warmCodex).not.toHaveBeenCalled();

    await registry({ AI_PROVIDER: 'antigravity' }).onModuleInit();
    expect(warm).toHaveBeenCalledTimes(1);
    expect(warmCodex).not.toHaveBeenCalled();

    await registry({ AI_PROVIDER: 'codex' }).onModuleInit();
    expect(warmCodex).toHaveBeenCalledTimes(1);
    expect(warm).toHaveBeenCalledTimes(1);
  });

  it('fails startup when the Codex adapter rejects its own settings', async () => {
    jest
      .spyOn(CodexCliAdapter.prototype, 'warm')
      .mockRejectedValue(new Error('unknown configuration field `x`'));

    await expect(
      registry({ AI_PROVIDER: 'codex' }).onModuleInit(),
    ).rejects.toThrow('unknown configuration field `x`');
  });

  // Preflight already checked sign-in; a failure here means the environment
  // changed, and an API with no model list would fail every request instead.
  it('fails startup when the active adapter cannot load its models', async () => {
    jest
      .spyOn(AntigravityCliAdapter.prototype, 'warm')
      .mockRejectedValue(new Error('agy models exited with code 1'));

    await expect(
      registry({ AI_PROVIDER: 'antigravity' }).onModuleInit(),
    ).rejects.toThrow('agy models exited with code 1');
  });

  describe('switching between local CLIs at runtime', () => {
    it('makes another local CLI active for every reader', () => {
      const r = registry({ AI_PROVIDER: 'claude' });

      r.setActiveLocalCli('codex');

      expect(r.getProviderId()).toBe('codex');
      expect(r.getActiveLocalCliAdapter()).toBeInstanceOf(CodexCliAdapter);
      expect(r.isLocalCliProvider()).toBe(true);
    });

    it('never moves a hosted deployment onto a local CLI', () => {
      const r = registry({});

      expect(() => r.setActiveLocalCli('codex')).toThrow(/not a local CLI/);
      expect(r.getProviderId()).toBe('openrouter');
    });

    it('refuses an id with no registered adapter and stays put', () => {
      const r = registry({ AI_PROVIDER: 'claude' });

      expect(() => r.setActiveLocalCli('gemini-cli' as never)).toThrow(
        /No local CLI adapter/,
      );
      expect(r.getProviderId()).toBe('claude-code');
    });

    it('looks up any registered adapter, active or not', () => {
      const r = registry({ AI_PROVIDER: 'claude' });

      expect(r.getLocalCliAdapter('antigravity')).toBeInstanceOf(
        AntigravityCliAdapter,
      );
      expect(r.getLocalCliAdapter('openrouter')).toBeUndefined();
    });
  });

  // The launcher and Settings name CLIs by the shared catalogue; the API runs
  // them through adapters. A CLI present in one but not the other would be
  // offered and then fail, or run and never be offered.
  it('has exactly one adapter for every CLI in the shared catalogue', () => {
    const r = registry({ AI_PROVIDER: 'claude' });
    const adapterIds = r
      .getLocalCliAdapters()
      .map((a) => a.providerId)
      .sort();

    expect(SUPPORTED_PROVIDERS.map((p) => p.adapterId).sort()).toEqual(
      adapterIds,
    );
    for (const provider of SUPPORTED_PROVIDERS) {
      expect(r.getLocalCliAdapter(provider.adapterId)?.binary).toBe(
        provider.binary,
      );
      // Every name the launcher accepts reaches the same adapter here.
      for (const name of [provider.id, ...provider.aliases]) {
        expect(registry({ AI_PROVIDER: name }).getProviderId()).toBe(
          provider.adapterId,
        );
      }
    }
  });
});
