import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { User } from '../../../schemas/user.schema';

import { OpenRouterModelsService } from './openrouter-models.service';

export interface AllowedModel {
  id: string;
  label: string;
}

/** Model served to free (non-BYOK) users. */
const FREE_MODEL = 'qwen/qwen3.7-max';

const DEFAULT_MODEL = FREE_MODEL;

const CURATED_MODELS: AllowedModel[] = [
  { id: FREE_MODEL, label: 'Qwen3.7 Max' },
];

@Injectable()
export class AiPolicyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterModelsService: OpenRouterModelsService,
  ) {}

  getCuratedModels(): AllowedModel[] {
    return CURATED_MODELS;
  }

  getDefaultModel(): string {
    return DEFAULT_MODEL;
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
    hasByok: boolean;
    requestedModel?: string;
    userActiveModel?: string;
    validationApiKey: string;
  }): Promise<string> {
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
