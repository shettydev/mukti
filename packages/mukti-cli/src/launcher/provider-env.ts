/**
 * What the launcher tells the API about how this launch chose its AI provider.
 *
 * @remarks
 * Settings can switch provider at runtime and keep the choice as the default.
 * To do that the API needs two things only the launcher knows: which file holds
 * the saved default (the Mukti home moves with `--data-dir` and `MUKTI_HOME`,
 * and repo mode keeps it in the user-level home, not the checkout), and how
 * this launch decided, so Settings can warn that `--provider` and `AI_PROVIDER`
 * win over a saved default. Both launcher modes build these variables here so
 * they cannot drift.
 */
import type { LocalCliProvider, SelectionSource } from './providers.ts';

import { providerSettingsPath } from './provider-settings.ts';

/** Variables the API reads; see `local-provider-switch.service.ts` there. */
export const PROVIDER_SETTINGS_ENV = 'MUKTI_PROVIDER_SETTINGS';
export const PROVIDER_SOURCE_ENV = 'MUKTI_PROVIDER_SOURCE';

/** Environment for the API process describing this launch's provider choice. */
export function providerEnv(options: {
  /** The Mukti home holding the saved default. Must be absolute. */
  readonly home: string;
  readonly provider: LocalCliProvider;
  readonly source: SelectionSource;
}): Record<string, string> {
  return {
    AI_PROVIDER: options.provider.id,
    [PROVIDER_SETTINGS_ENV]: providerSettingsPath(options.home),
    [PROVIDER_SOURCE_ENV]: options.source,
  };
}
