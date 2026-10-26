import { apiClient } from './client';

export type AiSettings = {
  activeModel?: string;
  hasOpenRouterKey: boolean;
  openRouterKeyLast4: null | string;
};

/** How the launcher chose this launch's AI CLI. */
export type LaunchSource = 'detected' | 'env' | 'option' | 'picked' | 'saved' | 'unknown';

/** One supported local AI CLI, as Settings shows it. */
export type LocalProvider = {
  active: boolean;
  binary: string;
  /** What using it costs or leaves behind, shown before switching to it. */
  disclosure: null | string;
  /** The command it runs as: `claude`, `codex` or `agy`. */
  id: string;
  installRemediation: string;
  label: string;
  readiness: LocalProviderReadiness;
  signInRemediation: string;
  tradeOff: string;
  version: null | string;
};

/** Whether a local AI CLI can be used here. */
export type LocalProviderReadiness = 'missing' | 'ready' | 'signed-out';

/** Every local AI CLI's readiness, and what Settings needs to explain a switch. */
export type LocalProvidersStatus = {
  activeId: string;
  /** The model this user's turns run on under the active CLI. */
  activeModel: string;
  checkedAt: string;
  launchSource: LaunchSource;
  providers: LocalProvider[];
  saveDefault: { available: false; reason: string } | { available: true; savedId: null | string };
};

/** The outcome of a switch, with what the model picker needs to refresh. */
export type SwitchProviderResult = {
  activeId: string;
  activeModel: string;
  changed: boolean;
  models: CuratedModel[];
  saved: boolean;
  /** Why saving was asked for but did not happen. */
  warning?: string;
};

type AiModelsResponse =
  | { mode: 'curated'; models: CuratedModel[] }
  | { mode: 'openrouter'; models: OpenRouterModel[] };

type CuratedModel = { id: string; label: string };

type OpenRouterModel = { id: string; name: string };

export const aiApi = {
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

  /**
   * Every local AI CLI's readiness (local mode only). `refresh` probes the CLIs
   * again instead of reusing a result from the last 30 seconds.
   */
  getProviders: async (refresh = false): Promise<LocalProvidersStatus> => {
    return apiClient.get<LocalProvidersStatus>(`/ai/providers${refresh ? '?refresh=1' : ''}`);
  },

  getSettings: async (): Promise<AiSettings> => {
    const response = await apiClient.get<{
      activeModel?: string;
      hasOpenRouterKey: boolean;
      openRouterKeyLast4: null | string;
    }>('/ai/settings');
    return response;
  },

  setOpenRouterKey: async (dto: {
    apiKey: string;
  }): Promise<{ hasOpenRouterKey: boolean; openRouterKeyLast4: string }> => {
    return apiClient.put<{ hasOpenRouterKey: boolean; openRouterKeyLast4: string }>(
      '/ai/openrouter-key',
      dto
    );
  },

  /**
   * Makes another local AI CLI active (local mode only).
   *
   * @remarks
   * Can take several seconds, longest for Antigravity: the API checks the CLI
   * is signed in and prepares it before switching. A refusal (not installed,
   * signed out, could not be prepared, another switch running) rejects with an
   * `ApiClientError` whose message names the fix, and changes nothing.
   */
  switchProvider: async (dto: {
    id: string;
    saveAsDefault: boolean;
  }): Promise<SwitchProviderResult> => {
    return apiClient.put<SwitchProviderResult>('/ai/provider', dto);
  },

  updateSettings: async (dto: { activeModel: string }): Promise<{ activeModel: string }> => {
    return apiClient.patch<{ activeModel: string }>('/ai/settings', dto);
  },
};
