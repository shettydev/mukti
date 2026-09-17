/**
 * The model the web app sends, in local and hosted mode.
 *
 * @remarks
 * Every chat surface sends the store's `activeModel` with each message. In local
 * mode the model catalogue belongs to whichever AI CLI the launcher picked, so
 * a hosted OpenRouter id must never be the store's starting point or fallback —
 * a CLI handed a model it does not know fails the turn.
 */
jest.mock('@/lib/api/ai', () => ({
  aiApi: {
    getModels: jest.fn(),
    getSettings: jest.fn(),
  },
}));

import type { useAiStore } from '@/lib/stores/ai-store';

import { aiApi } from '@/lib/api/ai';

const HOSTED_DEFAULT = 'anthropic/claude-sonnet-4-6';
const ORIGINAL = process.env.NEXT_PUBLIC_MUKTI_LOCAL;

/** Loads the store anew, so its initial state reflects the current mode. */
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

describe('ai-store model selection', () => {
  beforeEach(() => {
    (aiApi.getSettings as jest.Mock).mockResolvedValue({
      hasOpenRouterKey: false,
      openRouterKeyLast4: null,
    });
    (aiApi.getModels as jest.Mock).mockResolvedValue({
      mode: 'curated',
      models: [{ id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' }],
    });
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

    it('starts with no model rather than a hosted one', async () => {
      expect((await freshStore()).getState().activeModel).toBeNull();
    });

    it('does not fall back to a hosted model when settings name none', async () => {
      const store = await freshStore();

      await store.getState().hydrate();

      expect(store.getState().activeModel).toBeNull();
      expect(store.getState().activeModel).not.toBe(HOSTED_DEFAULT);
    });

    it('uses the model the API reports for the active CLI', async () => {
      (aiApi.getSettings as jest.Mock).mockResolvedValue({
        activeModel: 'gemini-3.8-flash-high',
        hasOpenRouterKey: false,
        openRouterKeyLast4: null,
      });
      const store = await freshStore();

      await store.getState().hydrate();

      expect(store.getState().activeModel).toBe('gemini-3.8-flash-high');
      expect(store.getState().models.map((m) => m.id)).toEqual(['gemini-3.8-flash-high']);
    });
  });

  describe('in hosted mode', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
    });

    it('keeps the hosted default before and after settings load', async () => {
      const store = await freshStore();
      expect(store.getState().activeModel).toBe(HOSTED_DEFAULT);

      await store.getState().hydrate();

      expect(store.getState().activeModel).toBe(HOSTED_DEFAULT);
    });
  });
});
