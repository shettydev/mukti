import { create } from 'zustand';

import { aiApi, type AiSettings } from '@/lib/api/ai';

export type AiModelMode = 'curated' | 'openrouter';

export type AiModelOption = {
  id: string;
  label: string;
};

interface AiStoreState {
  activeModel: null | string;
  deleteOpenAiKey: () => Promise<void>;
  deleteOpenRouterKey: () => Promise<void>;
  hasOpenAiKey: boolean;
  hasOpenRouterKey: boolean;
  hydrate: () => Promise<void>;
  isHydrated: boolean;
  mode: AiModelMode;

  models: AiModelOption[];
  openAiKeyLast4: null | string;
  openRouterKeyLast4: null | string;
  refreshModels: () => Promise<void>;
  setActiveModel: (model: string) => Promise<void>;
  setOpenAiKey: (apiKey: string) => Promise<void>;
  setOpenRouterKey: (apiKey: string) => Promise<void>;
}

export const useAiStore = create<AiStoreState>((set, get) => ({
  activeModel: 'openai/gpt-5-mini',
  deleteOpenAiKey: async () => {
    await aiApi.deleteOpenAiKey();
    await get().hydrate();
  },
  deleteOpenRouterKey: async () => {
    await aiApi.deleteOpenRouterKey();
    await get().hydrate();
  },
  hasOpenAiKey: false,
  hasOpenRouterKey: false,
  hydrate: async () => {
    try {
      const settings = (await aiApi.getSettings()) as AiSettings;

      set({
        activeModel: settings.activeModel ?? 'openai/gpt-5-mini',
        hasOpenAiKey: settings.hasOpenAiKey,
        hasOpenRouterKey: settings.hasOpenRouterKey,
        isHydrated: true,
        openAiKeyLast4: settings.openAiKeyLast4,
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

  openAiKeyLast4: null,
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

  setOpenAiKey: async (apiKey: string) => {
    await aiApi.setOpenAiKey({ apiKey });
    await get().hydrate();
  },

  setOpenRouterKey: async (apiKey: string) => {
    await aiApi.setOpenRouterKey({ apiKey });
    await get().hydrate();
  },
}));
