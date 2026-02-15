import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { User } from '../../../schemas/user.schema';

import { OpenRouterModelsService } from './openrouter-models.service';

export type AiModelMode = 'curated' | 'gemini' | 'openrouter';
export type AiProvider = 'gemini' | 'openrouter';

export interface AllowedModel {
  id: string;
  label: string;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-5-mini';

const CURATED_OPENROUTER_MODELS: AllowedModel[] = [
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
];

const GEMINI_MODELS: AllowedModel[] = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

@Injectable()
export class AiPolicyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterModelsService: OpenRouterModelsService,
  ) {}

  getCuratedModels(): AllowedModel[] {
    return CURATED_OPENROUTER_MODELS;
  }

  getDefaultProvider(): AiProvider {
    return 'openrouter';
  }

  getDefaultModel(provider: AiProvider = 'openrouter'): string {
    return provider === 'gemini'
      ? DEFAULT_GEMINI_MODEL
      : DEFAULT_OPENROUTER_MODEL;
  }

  getGeminiModels(): AllowedModel[] {
    return GEMINI_MODELS;
  }

  getModelMode(params: {
    activeProvider: AiProvider;
    hasOpenRouterByok: boolean;
  }): AiModelMode {
    if (params.activeProvider === 'gemini') {
      return 'gemini';
    }

    return params.hasOpenRouterByok ? 'openrouter' : 'curated';
  }

  isGeminiModel(model: string): boolean {
    return GEMINI_MODELS.some((allowed) => allowed.id === model.trim());
  }

  isModelCompatibleWithProvider(params: {
    activeProvider: AiProvider;
    hasOpenRouterByok: boolean;
    model?: string;
  }): boolean {
    const model = params.model?.trim();

    if (!model) {
      return false;
    }

    if (params.activeProvider === 'gemini') {
      return this.isGeminiModel(model);
    }

    if (params.hasOpenRouterByok) {
      return !this.isGeminiModel(model);
    }

    return CURATED_OPENROUTER_MODELS.some((allowed) => allowed.id === model);
  }

  coerceModelForProvider(params: {
    activeProvider: AiProvider;
    hasOpenRouterByok: boolean;
    model?: string;
  }): string {
    if (this.isModelCompatibleWithProvider(params)) {
      return params.model!.trim();
    }

    return this.getDefaultModel(params.activeProvider);
  }

  resolveActiveProvider(params: {
    hasGeminiKey: boolean;
    hasOpenRouterAccess: boolean;
    preferredProvider?: AiProvider;
  }): AiProvider {
    if (params.preferredProvider === 'gemini' && params.hasGeminiKey) {
      return 'gemini';
    }

    if (
      params.preferredProvider === 'openrouter' &&
      params.hasOpenRouterAccess
    ) {
      return 'openrouter';
    }

    if (params.hasGeminiKey && !params.hasOpenRouterAccess) {
      return 'gemini';
    }

    if (params.hasOpenRouterAccess) {
      return 'openrouter';
    }

    if (params.hasGeminiKey) {
      return 'gemini';
    }

    return this.getDefaultProvider();
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

  async resolveEffectiveModel(params: {
    activeProvider?: AiProvider;
    hasByok: boolean;
    requestedModel?: string;
    userActiveModel?: string;
    validationApiKey?: string;
  }): Promise<string> {
    const activeProvider = params.activeProvider ?? 'openrouter';
    const candidate =
      params.requestedModel ??
      params.userActiveModel ??
      this.getDefaultModel(activeProvider);

    if (activeProvider === 'gemini') {
      const isAllowed = GEMINI_MODELS.some((m) => m.id === candidate);
      if (!isAllowed) {
        throw new BadRequestException({
          error: {
            code: 'MODEL_NOT_ALLOWED',
            message: 'Model not available for Gemini',
          },
        });
      }

      return candidate;
    }

    if (!params.hasByok) {
      const isCurated = CURATED_OPENROUTER_MODELS.some(
        (m) => m.id === candidate,
      );
      if (!isCurated) {
        throw new BadRequestException({
          error: {
            code: 'MODEL_NOT_ALLOWED',
            message: 'Model not allowed for this account',
          },
        });
      }
    }

    if (!params.validationApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

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
