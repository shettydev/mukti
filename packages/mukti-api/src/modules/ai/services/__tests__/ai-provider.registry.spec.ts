import type { ConfigService } from '@nestjs/config';

import { mkdtempSync, realpathSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { AntigravityCliAdapter } from '../adapters/antigravity-cli.adapter';
import { ClaudeCliAdapter } from '../adapters/claude-cli.adapter';
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

  it('fails startup on an unknown provider, naming every supported value, without falling back', async () => {
    const r = registry({ AI_PROVIDER: 'gemini-cli' });

    await expect(r.onModuleInit()).rejects.toThrow(
      'Unsupported AI_PROVIDER "gemini-cli". Supported values: openrouter, claude-code, antigravity, agy, claude.',
    );
    expect(r.isLocalCliProvider()).toBe(false);
  });

  it('warms only the active adapter at startup', async () => {
    const warm = jest
      .spyOn(AntigravityCliAdapter.prototype, 'warm')
      .mockResolvedValue();

    await registry({ AI_PROVIDER: 'claude-code' }).onModuleInit();
    expect(warm).not.toHaveBeenCalled();

    await registry({ AI_PROVIDER: 'antigravity' }).onModuleInit();
    expect(warm).toHaveBeenCalledTimes(1);
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
});
