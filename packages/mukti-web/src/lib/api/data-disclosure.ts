import { apiClient } from './client';

export interface DataDeletionResult {
  failedCategories: string[];
  outside: string[];
  results: { category: string; deletedCount: number; error?: string; success: boolean }[];
  success: boolean;
}

/** The running API supplies facts for exactly one active configuration. */
export interface DataDisclosure {
  configuration: 'hosted-free' | 'hosted-own-key' | 'local';
  deletion: { action: string; label: string };
  model: {
    billedTo: string;
    disclosure?: string;
    limits: { dailyMessages: number; kind: 'free-daily'; resetsAt: string } | { kind: 'own-plan' };
    planNote: string;
    runner: string;
  };
  notRun: { id: string; label: string }[];
  outside: { howToRemove: string; what: string; where: string }[];
  storage: { items: string[]; location: string; settingsLocation?: string };
  surfaces: {
    historyWindow?: number;
    id: string;
    keyNote: string;
    label: string;
    sends: string[];
  }[];
}

export const dataDisclosureApi = {
  deleteData: (account = false) =>
    apiClient.delete<DataDeletionResult>(account ? '/me' : '/me/data', {
      body: JSON.stringify({ confirm: 'DELETE' }),
    }),
  get: (publicView = false) =>
    apiClient.get<DataDisclosure>(publicView ? '/data-disclosure/hosted' : '/data-disclosure', {
      cache: 'no-store',
    }),
};
