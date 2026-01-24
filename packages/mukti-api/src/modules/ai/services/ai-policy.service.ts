import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { User } from '../../../schemas/user.schema';

import { OpenRouterModelsService } from './openrouter-models.service';

export interface AllowedModel {
  id: string;
  label: string;
}

const DEFAULT_MODEL = 'openai/gpt-5-mini';

const CURATED_MODELS: AllowedModel[] = [
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
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

  hasUserOpenRouterKey(user: Pick<User, 'openRouterApiKeyEncrypted'>): boolean {
    return !!user.openRouterApiKeyEncrypted;
  }

  async resolveEffectiveModel(params: {
    hasByok: boolean;
    requestedModel?: string;
    userActiveModel?: string;
    validationApiKey: string;
  }): Promise<string> {
    const candidate =
      params.requestedModel ?? params.userActiveModel ?? DEFAULT_MODEL;

    if (!params.hasByok) {
      const isCurated = CURATED_MODELS.some((m) => m.id === candidate);
      if (!isCurated) {
        throw new BadRequestException({
          error: {
            code: 'MODEL_NOT_ALLOWED',
            message: 'Model not allowed for this account',
          },
        });
      }
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
