import { create } from 'zustand';

import { aiApi, type AiProvider, type AiSettings } from '@/lib/api/ai';

export type AiModelMode = 'curated' | 'gemini' | 'openrouter';

export type AiModelOption = {
  id: string;
  label: string;
};

interface AiStoreState {
  activeModel: null | string;
  activeProvider: AiProvider;
  deleteGeminiKey: () => Promise<void>;
  deleteOpenRouterKey: () => Promise<void>;
  geminiKeyLast4: null | string;
  hasGeminiKey: boolean;
  hasOpenRouterKey: boolean;
  hydrate: () => Promise<void>;
  isHydrated: boolean;
  mode: AiModelMode;

  models: AiModelOption[];
  openRouterKeyLast4: null | string;
  refreshModels: () => Promise<void>;
  setActiveModel: (model: string) => Promise<void>;
  setGeminiKey: (apiKey: string) => Promise<void>;
  setOpenRouterKey: (apiKey: string) => Promise<void>;
}

export const useAiStore = create<AiStoreState>((set, get) => ({
  activeModel: 'openai/gpt-5-mini',
  activeProvider: 'openrouter',
  deleteGeminiKey: async () => {
    await aiApi.deleteGeminiKey();
    await get().hydrate();
  },
  deleteOpenRouterKey: async () => {
    await aiApi.deleteOpenRouterKey();
    await get().hydrate();
  },
  geminiKeyLast4: null,
  hasGeminiKey: false,
  hasOpenRouterKey: false,
  hydrate: async () => {
    try {
      const settings = (await aiApi.getSettings()) as AiSettings;

      set({
        activeModel: settings.activeModel ?? 'openai/gpt-5-mini',
        activeProvider: settings.activeProvider,
        geminiKeyLast4: settings.geminiKeyLast4,
        hasGeminiKey: settings.hasGeminiKey,
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
          activeProvider: modelsResponse.provider,
          mode: 'curated',
          models: modelsResponse.models.map((m) => ({ id: m.id, label: m.label })),
        });
        return;
      }

      if (modelsResponse.mode === 'gemini') {
        set({
          activeProvider: modelsResponse.provider,
          mode: 'gemini',
          models: modelsResponse.models.map((m) => ({ id: m.id, label: m.label })),
        });
        return;
      }

      set({
        activeProvider: modelsResponse.provider,
        mode: 'openrouter',
        models: modelsResponse.models.map((m) => ({ id: m.id, label: m.name })),
      });
    } catch (error) {
      console.warn('Failed to refresh models:', error);
    }
  },

  setActiveModel: async (model: string) => {
    set({ activeModel: model });
    const updated = await aiApi.updateSettings({ activeModel: model });
    set({
      activeModel: updated.activeModel,
      activeProvider: updated.activeProvider,
    });
  },

  setGeminiKey: async (apiKey: string) => {
    await aiApi.setGeminiKey({ apiKey });
    await get().hydrate();
  },

  setOpenRouterKey: async (apiKey: string) => {
    await aiApi.setOpenRouterKey({ apiKey });
    await get().hydrate();
  },
}));
