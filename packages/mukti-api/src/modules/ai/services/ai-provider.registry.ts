/**
 * Resolves the active AI provider: from `AI_PROVIDER` at startup, and in local
 * mode from a switch in Settings thereafter.
 *
 * @remarks
 * Providers fall into two families: `openrouter`, which talks to an HTTP API
 * with a key, and the local-CLI family, which spawns a user-authenticated agent
 * CLI. Everything that distinguishes the second family — no API key, no
 * catalogue validation, no quota, zero cost — follows from "the user's own auth
 * on a local binary" rather than from any one CLI, so it is decided here once
 * and read through {@link AiPolicyService}.
 *
 * The active provider is state held here, seeded from `AI_PROVIDER`. Every
 * reader goes through this registry on each call, so a local-CLI switch
 * (`LocalProviderSwitchService`) reaches every AI surface on its next request.
 * Only a move between local CLIs is possible; the hosted provider never changes
 * after startup.
 *
 * An unrecognized `AI_PROVIDER` fails at startup rather than falling back:
 * silently degrading to `openrouter` would demand an API key that a local-mode
 * user does not have, surfacing as a confusing per-request failure instead of a
 * boot error naming the mistake.
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  LocalCliAdapter,
  LocalCliProviderId,
} from '../types/local-cli-adapter.interface';

import { AntigravityCliAdapter } from './adapters/antigravity-cli.adapter';
import { ClaudeCliAdapter } from './adapters/claude-cli.adapter';
import { CodexCliAdapter } from './adapters/codex-cli.adapter';

/** Provider that reaches an HTTP API using a key. */
const OPENROUTER_PROVIDER = 'openrouter';

const DEFAULT_PROVIDER = OPENROUTER_PROVIDER;

/**
 * Local CLIs named after the commands they run. The launcher asks for them
 * this way (`--provider claude`, `--provider agy`) and passes the name
 * straight through as `AI_PROVIDER`, while the first two adapters were
 * registered under longer names. Both are accepted so neither a saved launcher
 * default nor an older `.env` has to be rewritten. `codex` needs no alias: its
 * provider id is already its command.
 */
const PROVIDER_ALIASES: Readonly<Record<string, string>> = {
  agy: 'antigravity',
  claude: 'claude-code',
};

@Injectable()
export class AiProviderRegistry implements OnModuleInit {
  private activeId: string;
  private readonly adapters: readonly LocalCliAdapter[];
  private readonly logger = new Logger(AiProviderRegistry.name);

  /**
   * Every adapter is constructed, whichever provider is active, so construction
   * must stay free of I/O; per-provider setup belongs in `warm()`.
   */
  constructor(configService: ConfigService) {
    // Agy and Codex both run from a directory Mukti owns. MUKTI_CLI_WORKSPACE
    // names it; MUKTI_AGY_WORKSPACE is its older, agy-only name, still read so
    // an existing `.env` keeps working. `||` (not `??`) is deliberate: a blank
    // value means "use the default", not "run from ''".
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    const workspaceDir =
      configService.get<string>('MUKTI_CLI_WORKSPACE')?.trim() ||
      configService.get<string>('MUKTI_AGY_WORKSPACE')?.trim() ||
      undefined;
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    this.adapters = [
      new ClaudeCliAdapter(),
      new AntigravityCliAdapter({ workspaceDir }),
      new CodexCliAdapter({ workspaceDir }),
    ];

    // `||` (not `??`) is deliberate: an empty or whitespace-only AI_PROVIDER is
    // an unset one, and must fall through to the default rather than being
    // treated as a configured provider name.
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    const configured =
      configService.get<string>('AI_PROVIDER')?.trim() || DEFAULT_PROVIDER;
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    this.activeId = PROVIDER_ALIASES[configured] ?? configured;
  }

  /** The active local-CLI adapter, or `undefined` under `openrouter`. */
  getActiveLocalCliAdapter(): LocalCliAdapter | undefined {
    return this.getLocalCliAdapter(this.activeId);
  }

  /** The adapter registered under a local-CLI provider id, active or not. */
  getLocalCliAdapter(providerId: string): LocalCliAdapter | undefined {
    return this.adapters.find((a) => a.providerId === providerId);
  }

  /** Every registered local-CLI adapter. */
  getLocalCliAdapters(): readonly LocalCliAdapter[] {
    return this.adapters;
  }

  /**
   * The active provider: `AI_PROVIDER` at startup with any alias resolved,
   * defaulting to `openrouter` when unset, or the local CLI switched to since.
   */
  getProviderId(): string {
    return this.activeId;
  }

  /** Whether completions route through a local, user-authenticated CLI. */
  isLocalCliProvider(): boolean {
    return this.getActiveLocalCliAdapter() !== undefined;
  }

  /**
   * Validates the configured provider and performs one-time adapter setup.
   *
   * @remarks
   * Warming here is what lets `AiPolicyService`'s model getters stay
   * synchronous: adapters whose catalogue is discovered by subprocess populate
   * it once, at boot, so the nine call sites that read it never block
   * (design.md Decision 11).
   */
  async onModuleInit(): Promise<void> {
    this.assertProviderSupported();

    const adapter = this.getActiveLocalCliAdapter();
    if (!adapter?.warm) {
      return;
    }

    this.logger.log(`Preparing the ${adapter.binary} CLI provider`);
    await adapter.warm();
  }

  /**
   * Makes another local CLI the active provider, from the next request on.
   *
   * @remarks
   * The one mutation of the active provider. It does no checking of its own:
   * the caller ({@link LocalProviderSwitchService}) has already proved the CLI
   * is signed in and warmed it, so that this is the single, final step of a
   * switch and a failed switch never reaches it. Refuses anything that would
   * cross between the hosted and local families.
   *
   * @throws {Error} when no local CLI is active, or the target is not one.
   */
  setActiveLocalCli(providerId: LocalCliProviderId): void {
    if (!this.isLocalCliProvider()) {
      throw new Error(
        `Cannot switch to ${providerId}: the active provider is ${this.activeId}, not a local CLI.`,
      );
    }
    if (!this.getLocalCliAdapter(providerId)) {
      throw new Error(`No local CLI adapter is registered as ${providerId}.`);
    }
    this.activeId = providerId;
    this.logger.log(`Active AI provider is now ${providerId}`);
  }

  /** Fails fast on a provider value nothing can serve. */
  private assertProviderSupported(): void {
    const provider = this.getProviderId();
    const supported = [
      OPENROUTER_PROVIDER,
      ...this.adapters.map((a) => a.providerId),
    ];

    if (!supported.includes(provider)) {
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Supported values: ${[
          ...supported,
          ...Object.keys(PROVIDER_ALIASES),
        ].join(', ')}.`,
      );
    }
  }
}
