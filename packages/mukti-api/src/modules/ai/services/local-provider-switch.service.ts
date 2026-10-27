/**
 * Reports which local AI CLIs are ready, and switches between them at runtime.
 *
 * @remarks
 * Local mode only. The launcher picks a CLI before anything starts; this is
 * how Settings changes it afterwards, without restarting the API. Readiness
 * uses the shared provider catalogue's token-free probes, the same ones the
 * launcher runs, so Settings and the terminal never disagree.
 *
 * A switch checks everything that could fail before changing anything: the
 * target is a supported CLI, it is installed and signed in, and its one-time
 * preparation (`warm()`: model discovery, Codex's settings self-check)
 * succeeds. Only then is the registry's active provider changed, in one
 * assignment, so a failed switch never leaves anything half-done and the
 * previous provider keeps serving. Saving the choice as the launcher's default
 * comes after, and its failure is a warning, not a reason to undo the switch.
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';

import type {
  LocalCliProvider,
  ProviderStatus,
  RunCommand,
} from '../local-cli/provider-catalog';

import {
  probeProvider,
  PROVIDER_NAMES,
  providerById,
  SUPPORTED_PROVIDERS,
} from '../local-cli/provider-catalog';
import {
  readStoredProviderFile,
  writeStoredProviderFile,
} from '../local-cli/provider-settings-file';
import { runCommand } from '../local-cli/run-command';
import { AiProviderRegistry } from './ai-provider.registry';

/** How long a readiness result is reused before the CLIs are probed again. */
export const READINESS_TTL_MS = 30_000;

/** Injection token for the probe runner, so tests can answer for the CLIs. */
export const LOCAL_CLI_RUN_COMMAND = Symbol('LOCAL_CLI_RUN_COMMAND');

/** Environment the launcher sets; see `mukti-cli/src/launcher/provider-env.ts`. */
const PROVIDER_SETTINGS_ENV = 'MUKTI_PROVIDER_SETTINGS';
const PROVIDER_SOURCE_ENV = 'MUKTI_PROVIDER_SOURCE';

const LAUNCH_SOURCES = [
  'detected',
  'env',
  'option',
  'picked',
  'saved',
] as const;

/** How this launch chose its provider, as the launcher reported it. */
export type LaunchSource = 'unknown' | (typeof LAUNCH_SOURCES)[number];

export interface LocalProviderEntry {
  readonly active: boolean;
  readonly binary: string;
  readonly disclosure: null | string;
  readonly id: string;
  readonly installRemediation: string;
  readonly label: string;
  readonly readiness: ProviderStatus['readiness'];
  readonly signInRemediation: string;
  readonly tradeOff: string;
  readonly version: null | string;
}

export interface LocalProvidersStatus {
  /** The active CLI, by the id users know it by (`claude`, `codex`, `agy`). */
  readonly activeId: string;
  /** When readiness was last probed. */
  readonly checkedAt: string;
  readonly launchSource: LaunchSource;
  readonly providers: readonly LocalProviderEntry[];
  readonly saveDefault: SaveDefaultAvailability;
}

export type SaveDefaultAvailability =
  | { readonly available: false; readonly reason: string }
  | { readonly available: true; readonly savedId: null | string };

export interface SwitchResult {
  /** The active CLI after the request. */
  readonly activeId: string;
  /** Whether the provider actually changed. */
  readonly changed: boolean;
  /** Whether the choice was written as the default for later launches. */
  readonly saved: boolean;
  /** Why saving was asked for but did not happen. */
  readonly warning?: string;
}

interface ReadinessSnapshot {
  readonly at: number;
  readonly statuses: readonly ProviderStatus[];
}

@Injectable()
export class LocalProviderSwitchService {
  private readonly logger = new Logger(LocalProviderSwitchService.name);
  private probing?: Promise<ReadinessSnapshot>;
  private readonly run: RunCommand;
  private snapshot?: ReadinessSnapshot;
  private switching = false;

  constructor(
    private readonly registry: AiProviderRegistry,
    @Inject(LOCAL_CLI_RUN_COMMAND)
    @Optional()
    run?: RunCommand,
  ) {
    this.run = run ?? runCommand;
  }

  /**
   * Every supported CLI's readiness, plus what Settings needs to explain a
   * switch: which is active, how this launch chose, and whether a switch can
   * be saved as the default.
   */
  async getStatus(
    options: { refresh?: boolean } = {},
  ): Promise<LocalProvidersStatus> {
    const snapshot = await this.readiness(options.refresh === true);
    const activeAdapterId = this.registry.getProviderId();

    return {
      activeId:
        this.catalogueEntryForAdapter(activeAdapterId)?.id ?? activeAdapterId,
      checkedAt: new Date(snapshot.at).toISOString(),
      launchSource: this.launchSource(),
      providers: snapshot.statuses.map((status) =>
        this.describe(status, activeAdapterId),
      ),
      saveDefault: this.saveDefaultAvailability(),
    };
  }

  /**
   * Makes `requestedId` the active provider, if it is ready and prepares
   * cleanly; otherwise leaves the current one active and says why.
   *
   * @throws {BadRequestException} `UNSUPPORTED_PROVIDER` for a name that is not a
   * supported local CLI.
   * @throws {ConflictException} `PROVIDER_SWITCH_UNAVAILABLE`,
   * `PROVIDER_SWITCH_IN_PROGRESS`, `PROVIDER_NOT_READY` or `PROVIDER_WARM_FAILED`.
   */
  async switchTo(
    requestedId: string,
    options: { saveAsDefault?: boolean } = {},
  ): Promise<SwitchResult> {
    const provider = providerById(requestedId.trim());
    if (!provider) {
      throw new BadRequestException({
        error: {
          code: 'UNSUPPORTED_PROVIDER',
          message: `"${requestedId}" is not a supported local AI CLI. Use one of: ${SUPPORTED_PROVIDERS.map((p) => p.id).join(', ')}.`,
        },
      });
    }

    if (!this.registry.isLocalCliProvider()) {
      throw new ConflictException({
        error: {
          code: 'PROVIDER_SWITCH_UNAVAILABLE',
          message:
            'The AI provider can only be switched while Mukti is running on a local AI CLI.',
        },
      });
    }

    if (this.switching) {
      throw new ConflictException({
        error: {
          code: 'PROVIDER_SWITCH_IN_PROGRESS',
          message:
            'Another AI provider switch is still in progress. Wait for it to finish, then try again.',
        },
      });
    }

    this.switching = true;
    try {
      return await this.performSwitch(provider, options.saveAsDefault === true);
    } finally {
      this.switching = false;
    }
  }

  /** Refuses a CLI that is not installed or not signed in. */
  private async assertReady(provider: LocalCliProvider): Promise<void> {
    const cached = this.freshSnapshot()?.statuses.find(
      (s) => s.provider.id === provider.id,
    );
    // A recent "ready" is trusted; anything else is probed again, because the
    // user may have just signed in, which is usually why they are switching.
    const status =
      cached?.readiness === 'ready'
        ? cached
        : await probeProvider(provider, this.run);

    if (status.readiness === 'ready') {
      return;
    }

    this.forgetReadiness();
    const missing = status.readiness === 'missing';
    throw new ConflictException({
      error: {
        code: 'PROVIDER_NOT_READY',
        details: { id: provider.id, readiness: status.readiness },
        message: missing
          ? `The \`${provider.binary}\` CLI was not found on PATH. ${provider.installRemediation}`
          : `The \`${provider.binary}\` CLI is not signed in. ${provider.signInRemediation}`,
      },
    });
  }

  private catalogueEntryForAdapter(
    adapterId: string,
  ): LocalCliProvider | undefined {
    return SUPPORTED_PROVIDERS.find((p) => p.adapterId === adapterId);
  }

  private describe(
    status: ProviderStatus,
    activeAdapterId: string,
  ): LocalProviderEntry {
    const { provider } = status;
    return {
      active: provider.adapterId === activeAdapterId,
      binary: provider.binary,
      disclosure: provider.disclosure ?? null,
      id: provider.id,
      installRemediation: provider.installRemediation,
      label: provider.label,
      readiness: status.readiness,
      signInRemediation: provider.signInRemediation,
      tradeOff: provider.tradeOff,
      version: status.version ?? null,
    };
  }

  private forgetReadiness(): void {
    this.snapshot = undefined;
  }

  private freshSnapshot(): ReadinessSnapshot | undefined {
    return this.snapshot && Date.now() - this.snapshot.at < READINESS_TTL_MS
      ? this.snapshot
      : undefined;
  }

  private launchSource(): LaunchSource {
    const value = process.env[PROVIDER_SOURCE_ENV]?.trim();
    return LAUNCH_SOURCES.find((source) => source === value) ?? 'unknown';
  }

  private async performSwitch(
    provider: LocalCliProvider,
    saveAsDefault: boolean,
  ): Promise<SwitchResult> {
    const alreadyActive = this.registry.getProviderId() === provider.adapterId;

    if (!alreadyActive) {
      await this.assertReady(provider);
      await this.prepare(provider);
      // The only change a switch makes, and the last thing that can fail.
      this.registry.setActiveLocalCli(provider.adapterId);
      this.logger.log(`Switched the AI provider to ${provider.id}`);
    }

    if (!saveAsDefault) {
      return { activeId: provider.id, changed: !alreadyActive, saved: false };
    }

    const warning = this.saveDefault(provider);
    return {
      activeId: provider.id,
      changed: !alreadyActive,
      saved: warning === undefined,
      ...(warning === undefined ? {} : { warning }),
    };
  }

  /** Runs the target's one-time preparation, so it is usable the moment it is active. */
  private async prepare(provider: LocalCliProvider): Promise<void> {
    const adapter = this.registry.getLocalCliAdapter(provider.adapterId);
    if (!adapter) {
      // The catalogue and the registry are tested to match; this is a bug.
      throw new Error(`No adapter is registered for ${provider.id}.`);
    }

    try {
      await adapter.warm?.();
    } catch (error) {
      this.logger.warn(
        `Could not prepare ${provider.id}: ${(error as Error).message}`,
      );
      throw new ConflictException({
        error: {
          code: 'PROVIDER_WARM_FAILED',
          details: { id: provider.id },
          message: `${provider.label} could not be prepared, so Mukti is still using the previous AI CLI. ${(error as Error).message}`,
        },
      });
    }
  }

  /** Probes every CLI, reusing a recent result and sharing one in-flight run. */
  private async readiness(refresh: boolean): Promise<ReadinessSnapshot> {
    const fresh = refresh ? undefined : this.freshSnapshot();
    if (fresh) {
      return fresh;
    }

    // A refresh still joins a probe that is already running: it started after
    // the user asked, so its answer is as new as a second one would be.
    this.probing ??= Promise.all(
      SUPPORTED_PROVIDERS.map((provider) => probeProvider(provider, this.run)),
    )
      .then((statuses) => {
        this.snapshot = { at: Date.now(), statuses };
        return this.snapshot;
      })
      .finally(() => {
        this.probing = undefined;
      });

    return this.probing;
  }

  /** Writes the default, returning why it could not be written, if it could not. */
  private saveDefault(provider: LocalCliProvider): string | undefined {
    const file = this.settingsFile();
    if (!file) {
      return 'Mukti was not started by its launcher, so it does not know where your saved default lives. The switch applies to this session only.';
    }

    try {
      writeStoredProviderFile(file, provider.id);
      return undefined;
    } catch (error) {
      this.logger.warn(
        `Could not save ${provider.id} as the default in ${file}: ${(error as Error).message}`,
      );
      return `Switched, but ${file} could not be written (${(error as Error).message}), so the next launch will not use ${provider.label} by default.`;
    }
  }

  private saveDefaultAvailability(): SaveDefaultAvailability {
    const file = this.settingsFile();
    if (!file) {
      return {
        available: false,
        reason:
          'Mukti was not started by its launcher, so it does not know where your saved default lives.',
      };
    }

    const stored = readStoredProviderFile(file, PROVIDER_NAMES);
    const savedId = stored.provider
      ? (providerById(stored.provider)?.id ?? null)
      : null;
    return { available: true, savedId };
  }

  private settingsFile(): string | undefined {
    // `||` (not `??`): a blank value is an unset one.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    return process.env[PROVIDER_SETTINGS_ENV]?.trim() || undefined;
  }
}
