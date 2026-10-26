/**
 * Switching the local AI CLI from Settings, as the store sees it.
 *
 * @remarks
 * After a switch every model picker (Settings and the chat header) reads the
 * same store, so the store must hold the new CLI's models and the model turns
 * will now run on as soon as the switch succeeds. A model from the previous
 * CLI must not survive it: it would be sent with the next message. A refused
 * switch must change nothing.
 */
jest.mock('@/lib/api/ai', () => ({
  aiApi: {
    getModels: jest.fn(),
    getProviders: jest.fn(),
    getSettings: jest.fn(),
    switchProvider: jest.fn(),
  },
}));

import type { LocalProvidersStatus } from '@/lib/api/ai';
import type { useAiStore } from '@/lib/stores/ai-store';

import { aiApi } from '@/lib/api/ai';

const ORIGINAL = process.env.NEXT_PUBLIC_MUKTI_LOCAL;

const STATUS: LocalProvidersStatus = {
  activeId: 'claude',
  activeModel: 'opus',
  checkedAt: '2026-10-26T12:00:00.000Z',
  launchSource: 'saved',
  providers: [
    {
      active: true,
      binary: 'claude',
      disclosure: null,
      id: 'claude',
      installRemediation: 'Install Claude Code.',
      label: 'Claude CLI',
      readiness: 'ready',
      signInRemediation: 'Run `claude login` and try again.',
      tradeOff: 'about 13-20 seconds per reply',
      version: '2.1.0',
    },
    {
      active: false,
      binary: 'codex',
      disclosure: 'Your global ~/.codex/AGENTS.md does apply.',
      id: 'codex',
      installRemediation: 'Install the Codex CLI.',
      label: 'Codex CLI',
      readiness: 'ready',
      signInRemediation: 'Run `codex login` and try again.',
      tradeOff: 'about 8-12 seconds per reply',
      version: 'codex-cli 0.163.0',
    },
  ],
  saveDefault: { available: true, savedId: 'claude' },
};

async function freshStore(): Promise<typeof useAiStore> {
  const loaded: { store?: typeof useAiStore } = {};
  await jest.isolateModulesAsync(async () => {
    loaded.store = (await import('@/lib/stores/ai-store')).useAiStore;
  });
  if (!loaded.store) {
    throw new Error('ai-store did not load');
  }
  return loaded.store;
}

describe('ai-store provider switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (aiApi.getProviders as jest.Mock).mockResolvedValue(STATUS);
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
    } else {
      process.env.NEXT_PUBLIC_MUKTI_LOCAL = ORIGINAL;
    }
  });

  describe('in local mode', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_MUKTI_LOCAL = '1';
    });

    it('loads every CLI, and asks for a re-check only when told to', async () => {
      const store = await freshStore();

      await store.getState().loadProviders();
      await store.getState().loadProviders({ refresh: true });

      expect(aiApi.getProviders).toHaveBeenNthCalledWith(1, false);
      expect(aiApi.getProviders).toHaveBeenNthCalledWith(2, true);
      expect(store.getState().providerStatus).toEqual(STATUS);
      expect(store.getState().providersLoading).toBe(false);
    });

    it('keeps the reason when the list cannot be loaded', async () => {
      (aiApi.getProviders as jest.Mock).mockRejectedValue(new Error('API unreachable'));
      const store = await freshStore();

      await store.getState().loadProviders();

      expect(store.getState().providersError).toBe('API unreachable');
      expect(store.getState().providerStatus).toBeNull();
    });

    it('replaces the models and the active model with the new CLI’s on success', async () => {
      (aiApi.switchProvider as jest.Mock).mockResolvedValue({
        activeId: 'codex',
        activeModel: 'gpt-6.1-sol',
        changed: true,
        models: [{ id: 'gpt-6.1-sol', label: 'GPT-6.1-Sol' }],
        saved: true,
      });
      const store = await freshStore();
      store.setState({
        activeModel: 'opus',
        models: [{ id: 'opus', label: 'Claude Opus' }],
      });
      await store.getState().loadProviders();

      const result = await store.getState().switchProvider('codex', true);

      expect(aiApi.switchProvider).toHaveBeenCalledWith({ id: 'codex', saveAsDefault: true });
      expect(result.activeId).toBe('codex');
      const state = store.getState();
      expect(state.activeModel).toBe('gpt-6.1-sol');
      expect(state.models).toEqual([{ id: 'gpt-6.1-sol', label: 'GPT-6.1-Sol' }]);
      expect(state.providerStatus?.activeId).toBe('codex');
      expect(state.providerStatus?.providers.find((p) => p.active)?.id).toBe('codex');
      expect(state.providerStatus?.saveDefault).toEqual({ available: true, savedId: 'codex' });
      expect(state.switchingTo).toBeNull();
    });

    it('marks the switch in progress until it settles', async () => {
      let finish!: (value: unknown) => void;
      (aiApi.switchProvider as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          finish = resolve;
        })
      );
      const store = await freshStore();

      const pending = store.getState().switchProvider('codex', false);
      expect(store.getState().switchingTo).toBe('codex');

      finish({ activeId: 'codex', activeModel: 'm', changed: true, models: [], saved: false });
      await pending;
      expect(store.getState().switchingTo).toBeNull();
    });

    it('leaves everything as it was when the switch is refused', async () => {
      (aiApi.switchProvider as jest.Mock).mockRejectedValue(
        new Error('The `codex` CLI is not signed in. Run `codex login` and try again.')
      );
      const store = await freshStore();
      store.setState({
        activeModel: 'opus',
        models: [{ id: 'opus', label: 'Claude Opus' }],
      });
      await store.getState().loadProviders();

      await expect(store.getState().switchProvider('codex', true)).rejects.toThrow(/codex login/);

      const state = store.getState();
      expect(state.activeModel).toBe('opus');
      expect(state.models.map((m) => m.id)).toEqual(['opus']);
      expect(state.providerStatus?.activeId).toBe('claude');
      expect(state.providerStatus?.saveDefault).toEqual({ available: true, savedId: 'claude' });
      expect(state.switchingTo).toBeNull();
    });

    it('does not record a default the API did not save', async () => {
      (aiApi.switchProvider as jest.Mock).mockResolvedValue({
        activeId: 'codex',
        activeModel: 'gpt-6.1-sol',
        changed: true,
        models: [],
        saved: false,
        warning: 'could not be written',
      });
      const store = await freshStore();
      await store.getState().loadProviders();

      await store.getState().switchProvider('codex', true);

      expect(store.getState().providerStatus?.saveDefault).toEqual({
        available: true,
        savedId: 'claude',
      });
    });
  });

  describe('in hosted mode', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
    });

    it('never asks for the provider list', async () => {
      const store = await freshStore();

      await store.getState().loadProviders();

      expect(aiApi.getProviders).not.toHaveBeenCalled();
      expect(store.getState().providerStatus).toBeNull();
    });
  });
});
