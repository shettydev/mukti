import { apiClient } from './client';

export type AiSettings = {
  activeModel?: string;
  geminiKeyLast4: null | string;
  hasGeminiKey: boolean;
  hasOpenRouterKey: boolean;
  openRouterKeyLast4: null | string;
};

type AiModelsResponse =
  | { mode: 'curated'; models: CuratedModel[] }
  | { mode: 'openrouter'; models: OpenRouterModel[] };

type CuratedModel = { id: string; label: string };

type OpenRouterModel = { id: string; name: string };

export const aiApi = {
  deleteGeminiKey: async (): Promise<{
    geminiKeyLast4: null;
    hasGeminiKey: boolean;
  }> => {
    return apiClient.delete<{ geminiKeyLast4: null; hasGeminiKey: boolean }>('/ai/gemini-key');
  },

  deleteOpenRouterKey: async (): Promise<{
    hasOpenRouterKey: boolean;
    openRouterKeyLast4: null;
  }> => {
    return apiClient.delete<{ hasOpenRouterKey: boolean; openRouterKeyLast4: null }>(
      '/ai/openrouter-key'
    );
  },

  getModels: async (): Promise<AiModelsResponse> => {
    const response = await apiClient.get<{ mode: 'curated' | 'openrouter'; models: any[] }>(
      '/ai/models'
    );

    if (response.mode === 'curated') {
      return { mode: 'curated', models: response.models as CuratedModel[] };
    }

    return { mode: 'openrouter', models: response.models as OpenRouterModel[] };
  },

  getSettings: async (): Promise<AiSettings> => {
    const response = await apiClient.get<{
      activeModel?: string;
      geminiKeyLast4: null | string;
      hasGeminiKey: boolean;
      hasOpenRouterKey: boolean;
      openRouterKeyLast4: null | string;
    }>('/ai/settings');
    return response;
  },

  setGeminiKey: async (dto: {
    apiKey: string;
  }): Promise<{ geminiKeyLast4: string; hasGeminiKey: boolean }> => {
    return apiClient.put<{ geminiKeyLast4: string; hasGeminiKey: boolean }>('/ai/gemini-key', dto);
  },

  setOpenRouterKey: async (dto: {
    apiKey: string;
  }): Promise<{ hasOpenRouterKey: boolean; openRouterKeyLast4: string }> => {
    return apiClient.put<{ hasOpenRouterKey: boolean; openRouterKeyLast4: string }>(
      '/ai/openrouter-key',
      dto
    );
  },

  updateSettings: async (dto: { activeModel: string }): Promise<{ activeModel: string }> => {
    return apiClient.patch<{ activeModel: string }>('/ai/settings', dto);
  },
};
