/**
 * Resolves the active AI provider from `AI_PROVIDER`.
 *
 * @remarks
 * Providers fall into two families: `openrouter`, which talks to an HTTP API
 * with a key, and the local-CLI family, which spawns a user-authenticated agent
 * CLI. Everything that distinguishes the second family — no API key, no
 * catalogue validation, no quota, zero cost — follows from "the user's own auth
 * on a local binary" rather than from any one CLI, so it is decided here once
 * and read through {@link AiPolicyService}.
 *
 * An unrecognized `AI_PROVIDER` fails at startup rather than falling back:
 * silently degrading to `openrouter` would demand an API key that a local-mode
 * user does not have, surfacing as a confusing per-request failure instead of a
 * boot error naming the mistake.
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { LocalCliAdapter } from '../types/local-cli-adapter.interface';

import { AntigravityCliAdapter } from './adapters/antigravity-cli.adapter';
import { ClaudeCliAdapter } from './adapters/claude-cli.adapter';

/** Provider that reaches an HTTP API using a key. */
const OPENROUTER_PROVIDER = 'openrouter';

const DEFAULT_PROVIDER = OPENROUTER_PROVIDER;

@Injectable()
export class AiProviderRegistry implements OnModuleInit {
  private readonly adapters: readonly LocalCliAdapter[];
  private readonly logger = new Logger(AiProviderRegistry.name);

  /**
   * Every adapter is constructed, whichever provider is active, so construction
   * must stay free of I/O; per-provider setup belongs in `warm()`.
   */
  constructor(private readonly configService: ConfigService) {
    // `||` (not `??`) is deliberate: a blank MUKTI_AGY_WORKSPACE means "use the
    // default", not "run agy from ''".
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    const agyWorkspace =
      configService.get<string>('MUKTI_AGY_WORKSPACE')?.trim() || undefined;
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
    this.adapters = [
      new ClaudeCliAdapter(),
      new AntigravityCliAdapter({ workspaceDir: agyWorkspace }),
    ];
  }

  /** The active local-CLI adapter, or `undefined` under `openrouter`. */
  getActiveLocalCliAdapter(): LocalCliAdapter | undefined {
    const provider = this.getProviderId();
    return this.adapters.find((a) => a.providerId === provider);
  }

  /** Raw `AI_PROVIDER` value, defaulting to `openrouter` when unset. */
  getProviderId(): string {
    // `||` (not `??`) is deliberate: an empty or whitespace-only AI_PROVIDER is
    // an unset one, and must fall through to the default rather than being
    // treated as a configured provider name.
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    return (
      this.configService.get<string>('AI_PROVIDER')?.trim() || DEFAULT_PROVIDER
    );
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
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

  /** Fails fast on a provider value nothing can serve. */
  private assertProviderSupported(): void {
    const provider = this.getProviderId();
    const supported = [
      OPENROUTER_PROVIDER,
      ...this.adapters.map((a) => a.providerId),
    ];

    if (!supported.includes(provider)) {
      throw new Error(
        `Unsupported AI_PROVIDER "${provider}". Supported values: ${supported.join(', ')}.`,
      );
    }
  }
}
