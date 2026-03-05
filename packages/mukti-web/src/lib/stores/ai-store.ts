import { create } from 'zustand';

import { aiApi, type AiSettings } from '@/lib/api/ai';

export type AiModelOption = {
  id: string;
  label: string;
};

interface AiStoreState {
  activeModel: null | string;
  aiConfigured: boolean;
  hydrate: () => Promise<void>;
  isHydrated: boolean;
  models: AiModelOption[];
  refreshModels: () => Promise<void>;
  setActiveModel: (model: string) => Promise<void>;
}

export const useAiStore = create<AiStoreState>((set, get) => ({
  activeModel: null,
  aiConfigured: false,

  hydrate: async () => {
    try {
      const settings = (await aiApi.getSettings()) as AiSettings;

      set({
        activeModel: settings.activeModel ?? null,
        aiConfigured: settings.aiConfigured,
        isHydrated: true,
      });

      await get().refreshModels();
    } catch (error) {
      // Silently fail if not authenticated - user might be on login screen
      console.warn('Failed to hydrate AI store:', error);
    }
  },

  isHydrated: false,
  models: [],

  refreshModels: async () => {
    try {
      const modelsResponse = await aiApi.getModels();
      const mappedModels = modelsResponse.models.map((model) => ({
        id: model.id,
        label: model.label,
      }));

      set((state) => {
        const hasExistingModel =
          !!state.activeModel && mappedModels.some((model) => model.id === state.activeModel);

        return {
          activeModel: hasExistingModel ? state.activeModel : (mappedModels[0]?.id ?? null),
          aiConfigured: mappedModels.length > 0 || state.aiConfigured,
          models: mappedModels,
        };
      });
    } catch (error) {
      console.warn('Failed to refresh models:', error);
    }
  },

  setActiveModel: async (model: string) => {
    const previousModel = get().activeModel;

    set({ activeModel: model });

    try {
      const settings = await aiApi.updateSettings({ activeModel: model });
      set({
        activeModel: settings.activeModel ?? null,
        aiConfigured: settings.aiConfigured,
      });
    } catch (error) {
      set({ activeModel: previousModel });
      throw error;
    }
  },
}));
