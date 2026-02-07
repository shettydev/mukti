import { apiClient } from './client';

export type AiSettings = {
  activeModel?: string;
  anthropicKeyLast4: null | string;
  hasAnthropicKey: boolean;
  hasOpenRouterKey: boolean;
  openRouterKeyLast4: null | string;
};

type AiModelsResponse =
  | { mode: 'curated'; models: CuratedModel[] }
  | { mode: 'openrouter'; models: OpenRouterModel[] };

type CuratedModel = { id: string; label: string };

type OpenRouterModel = { id: string; name: string };

export const aiApi = {
  deleteAnthropicKey: async (): Promise<{
    anthropicKeyLast4: null;
    hasAnthropicKey: boolean;
  }> => {
    return apiClient.delete<{ anthropicKeyLast4: null; hasAnthropicKey: boolean }>(
      '/ai/anthropic-key'
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

  getSettings: async (): Promise<AiSettings> => {
    const response = await apiClient.get<{
      activeModel?: string;
      hasOpenRouterKey: boolean;
      openRouterKeyLast4: null | string;
    }>('/ai/settings');
    return response;
  },

  setAnthropicKey: async (dto: {
    apiKey: string;
  }): Promise<{ anthropicKeyLast4: string; hasAnthropicKey: boolean }> => {
    return apiClient.put<{ anthropicKeyLast4: string; hasAnthropicKey: boolean }>(
      '/ai/anthropic-key',
      dto
    );
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
