import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { User } from '../../../schemas/user.schema';
import type { AllowedModel } from '../types/ai-model.interface';

import { AiProviderRegistry } from './ai-provider.registry';
import { OpenRouterModelsService } from './openrouter-models.service';

export type { AllowedModel };

/** Model served to free (non-BYOK) users. */
const FREE_MODEL = 'qwen/qwen3.7-max';

const DEFAULT_MODEL = FREE_MODEL;

const CURATED_MODELS: AllowedModel[] = [
  { id: FREE_MODEL, label: 'Qwen3.7 Max' },
];

@Injectable()
export class AiPolicyService {
  constructor(
    private readonly aiProviderRegistry: AiProviderRegistry,
    private readonly configService: ConfigService,
    private readonly openRouterModelsService: OpenRouterModelsService,
  ) {}

  /**
   * Models offered for the active provider: the local CLI's own catalogue when
   * one is active, the OpenRouter curated list otherwise.
   */
  getCuratedModels(): AllowedModel[] {
    return (
      this.aiProviderRegistry.getActiveLocalCliAdapter()?.getModels() ??
      CURATED_MODELS
    );
  }

  getDefaultModel(): string {
    return this.getCuratedModels()[0]?.id ?? DEFAULT_MODEL;
  }

  getValidationApiKey(params: {
    byokApiKey?: string;
    hasByok: boolean;
  }): string {
    if (params.hasByok && params.byokApiKey) {
      return params.byokApiKey;
    }

    const serverKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!serverKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    return serverKey;
  }

  hasUserGeminiKey(user: Pick<User, 'geminiApiKeyEncrypted'>): boolean {
    return !!user.geminiApiKeyEncrypted;
  }

  hasUserOpenRouterKey(user: Pick<User, 'openRouterApiKeyEncrypted'>): boolean {
    return !!user.openRouterApiKeyEncrypted;
  }

  /**
   * Whether AI completions route through a local, user-authenticated agent CLI
   * (Claude Code, Antigravity) rather than an HTTP API.
   */
  isLocalCliProvider(): boolean {
    return this.aiProviderRegistry.isLocalCliProvider();
  }

  /**
   * Whether the active provider needs an API key at all.
   *
   * @remarks
   * Local-CLI providers run on the user's own CLI authentication and are handed
   * an empty key by design ({@link AiKeyResolver}), so an empty key is a
   * misconfiguration for key-based providers only. Feature services ask this
   * rather than re-deriving it from the provider identity, so that adding a
   * provider does not mean revisiting every surface that tolerates an empty key.
   */
  providerRequiresApiKey(): boolean {
    return !this.isLocalCliProvider();
  }

  async resolveEffectiveModel(params: {
    hasByok: boolean;
    requestedModel?: string;
    userActiveModel?: string;
    validationApiKey: string;
  }): Promise<string> {
    // A local CLI serves the models the user selects from its own catalogue; the
    // OpenRouter catalog is irrelevant, so skip validation and honour the choice.
    if (this.isLocalCliProvider()) {
      return (
        params.requestedModel ??
        params.userActiveModel ??
        this.getDefaultModel()
      );
    }

    // Free (non-BYOK) users are always served the free-tier model, regardless
    // of any requested or previously stored model preference.
    const candidate = params.hasByok
      ? (params.requestedModel ?? params.userActiveModel ?? DEFAULT_MODEL)
      : FREE_MODEL;

    // Always validate the model exists on OpenRouter.
    await this.validateModelOrThrow({
      apiKey: params.validationApiKey,
      model: candidate,
    });

    return candidate;
  }

  async validateModelOrThrow(params: {
    apiKey: string;
    model: string;
  }): Promise<void> {
    // No OpenRouter catalog to validate against when using a local CLI.
    if (this.isLocalCliProvider()) {
      return;
    }

    const exists = await this.openRouterModelsService.validateModelExists(
      params.apiKey,
      params.model,
    );

    if (!exists) {
      throw new BadRequestException({
        error: {
          code: 'MODEL_NOT_ALLOWED',
          message: 'Model not available on OpenRouter',
        },
      });
    }
  }
}
