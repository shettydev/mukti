import { apiClient } from './client';

export type AiSettings = {
  activeModel?: string;
  hasOpenRouterKey: boolean;
  openRouterKeyLast4: null | string;
};

type CuratedModel = { id: string; label: string };

type OpenRouterModel = { id: string; name: string };

type AiModelsResponse =
  | { mode: 'curated'; models: CuratedModel[] }
  | { mode: 'openrouter'; models: OpenRouterModel[] };

export const aiApi = {
  getSettings: async (): Promise<AiSettings> => {
    const response = await apiClient.get<{
      activeModel?: string;
      hasOpenRouterKey: boolean;
      openRouterKeyLast4: null | string;
    }>('/ai/settings');
    return response;
  },

  updateSettings: async (dto: { activeModel: string }): Promise<{ activeModel: string }> => {
    return apiClient.patch<{ activeModel: string }>('/ai/settings', dto);
  },

  setOpenRouterKey: async (dto: {
    apiKey: string;
  }): Promise<{ hasOpenRouterKey: boolean; openRouterKeyLast4: string }> => {
    return apiClient.put<{ hasOpenRouterKey: boolean; openRouterKeyLast4: string }>(
      '/ai/openrouter-key',
      dto
    );
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
};
