import { apiClient } from './client';

export type AiModel = {
  id: string;
  label: string;
};

export type AiSettings = {
  activeModel?: null | string;
  aiConfigured: boolean;
};

export const aiApi = {
  getModels: async (): Promise<{ models: AiModel[] }> => {
    return apiClient.get<{ models: AiModel[] }>('/ai/models');
  },

  getSettings: async (): Promise<AiSettings> => {
    return apiClient.get<AiSettings>('/ai/settings');
  },

  updateSettings: async (dto: { activeModel?: string }): Promise<AiSettings> => {
    return apiClient.patch<AiSettings>('/ai/settings', dto);
  },
};
