import { create } from 'zustand';

import { aiApi, type AiSettings } from '@/lib/api/ai';

export type AiModelMode = 'curated' | 'openrouter';

export type AiModelOption = {
  id: string;
  label: string;
};

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

export const useAiStore = create<AiStoreState>((set, get) => ({
  activeModel: 'openai/gpt-5-mini',
  deleteOpenRouterKey: async () => {
    await aiApi.deleteOpenRouterKey();
    await get().hydrate();
  },
  hasOpenRouterKey: false,
  hydrate: async () => {
    const settings = (await aiApi.getSettings()) as AiSettings;

    set({
      activeModel: settings.activeModel ?? 'openai/gpt-5-mini',
      hasOpenRouterKey: settings.hasOpenRouterKey,
      isHydrated: true,
      openRouterKeyLast4: settings.openRouterKeyLast4,
    });

    await get().refreshModels();
  },
  isHydrated: false,
  mode: 'curated',

  models: [],

  openRouterKeyLast4: null,

  refreshModels: async () => {
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
