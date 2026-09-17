import { create } from 'zustand';

import { aiApi, type AiSettings } from '@/lib/api/ai';
import { isLocalMode } from '@/lib/config';

export type AiModelMode = 'curated' | 'openrouter';

export type AiModelOption = {
  id: string;
  label: string;
};

/**
 * OpenRouter model shown before the hosted API reports a preference.
 *
 * @remarks
 * Never used in local mode: there the catalogue belongs to whichever AI CLI the
 * launcher picked, the API always reports a model that CLI offers, and a hosted
 * id sent in the meantime would name a model the CLI does not know.
 */
const HOSTED_DEFAULT_MODEL = 'anthropic/claude-sonnet-4-6';

interface AiStoreState {
  activeModel: null | string;
  deleteOpenRouterKey: () => Promise<void>;
  hasOpenRouterKey: boolean;
  hydrate: () => Promise<void>;
  isHydrated: boolean;
  mode: AiModelMode;

  models: AiModelOption[];
  openRouterKeyLast4: null | string;
  refreshModels: () => Promise<void>;
  setActiveModel: (model: string) => Promise<void>;
  setOpenRouterKey: (apiKey: string) => Promise<void>;
}

function fallbackModel(): null | string {
  return isLocalMode() ? null : HOSTED_DEFAULT_MODEL;
}

export const useAiStore = create<AiStoreState>((set, get) => ({
  activeModel: fallbackModel(),
  deleteOpenRouterKey: async () => {
    await aiApi.deleteOpenRouterKey();
    await get().hydrate();
  },
  hasOpenRouterKey: false,
  hydrate: async () => {
    try {
      const settings = (await aiApi.getSettings()) as AiSettings;

      set({
        activeModel: settings.activeModel ?? fallbackModel(),
        hasOpenRouterKey: settings.hasOpenRouterKey,
        isHydrated: true,
        openRouterKeyLast4: settings.openRouterKeyLast4,
      });

      await get().refreshModels();
    } catch (error) {
      // Silently fail if not authenticated - user might be on login screen
      console.warn('Failed to hydrate AI store:', error);
    }
  },
  isHydrated: false,
  mode: 'curated',

  models: [],

  openRouterKeyLast4: null,

  refreshModels: async () => {
    try {
      const modelsResponse = await aiApi.getModels();

      if (modelsResponse.mode === 'curated') {
        set({
          mode: 'curated',
          models: modelsResponse.models.map((m) => ({ id: m.id, label: m.label })),
        });
        return;
      }

      set({
        mode: 'openrouter',
        models: modelsResponse.models.map((m) => ({ id: m.id, label: m.name })),
      });
    } catch (error) {
      console.warn('Failed to refresh models:', error);
    }
  },

  setActiveModel: async (model: string) => {
    set({ activeModel: model });
    await aiApi.updateSettings({ activeModel: model });
  },

  setOpenRouterKey: async (apiKey: string) => {
    await aiApi.setOpenRouterKey({ apiKey });
    await get().hydrate();
  },
}));
