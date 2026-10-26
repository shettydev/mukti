import { create } from 'zustand';

import {
  aiApi,
  type AiSettings,
  type LocalProvidersStatus,
  type SwitchProviderResult,
} from '@/lib/api/ai';
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
  /**
   * Loads every local AI CLI's readiness (local mode only). `refresh` probes
   * the CLIs again rather than reusing a recent result.
   */
  loadProviders: (options?: { refresh?: boolean }) => Promise<void>;
  mode: AiModelMode;

  models: AiModelOption[];
  openRouterKeyLast4: null | string;
  /** Why the provider list could not be loaded, if it could not. */
  providersError: null | string;
  providersLoading: boolean;
  /** Local AI CLIs and their readiness; `null` until loaded, and outside local mode. */
  providerStatus: LocalProvidersStatus | null;
  refreshModels: () => Promise<void>;
  setActiveModel: (model: string) => Promise<void>;
  setOpenRouterKey: (apiKey: string) => Promise<void>;
  /** The CLI a switch is in progress to, or `null`. */
  switchingTo: null | string;
  /**
   * Makes another local AI CLI active. On success the model list and active
   * model are replaced with the new CLI's, so every model picker follows
   * without a reload. On failure nothing changes and the error is rethrown,
   * carrying the API's explanation.
   */
  switchProvider: (id: string, saveAsDefault: boolean) => Promise<SwitchProviderResult>;
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
  loadProviders: async (options = {}) => {
    if (!isLocalMode()) {
      return;
    }
    set({ providersError: null, providersLoading: true });
    try {
      const status = await aiApi.getProviders(options.refresh === true);
      set({ providersLoading: false, providerStatus: status });
    } catch (error) {
      set({
        providersError:
          error instanceof Error ? error.message : 'Could not check which AI CLIs are ready.',
        providersLoading: false,
      });
    }
  },
  mode: 'curated',

  models: [],

  openRouterKeyLast4: null,

  providersError: null,

  providersLoading: false,

  providerStatus: null,

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

  switchingTo: null,

  switchProvider: async (id: string, saveAsDefault: boolean) => {
    set({ switchingTo: id });
    try {
      const result = await aiApi.switchProvider({ id, saveAsDefault });

      // The response carries the new CLI's models and the model this user's
      // turns now run on, so every picker updates in this one round trip.
      set({
        activeModel: result.activeModel,
        mode: 'curated',
        models: result.models.map((m) => ({ id: m.id, label: m.label })),
      });

      const previous = get().providerStatus;
      if (previous) {
        set({
          providerStatus: {
            ...previous,
            activeId: result.activeId,
            activeModel: result.activeModel,
            providers: previous.providers.map((p) => ({
              ...p,
              active: p.id === result.activeId,
            })),
            saveDefault:
              result.saved && previous.saveDefault.available
                ? { available: true, savedId: result.activeId }
                : previous.saveDefault,
          },
        });
      }

      return result;
    } finally {
      set({ switchingTo: null });
    }
  },
}));
