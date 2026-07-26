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

/**
 * Claude models offered when the claude-code provider is active. Ids are Claude
 * CLI aliases passed verbatim to `claude -p --model`; the developer's selection
 * is persisted as usual on `user.activeModel`.
 */
const CLAUDE_CODE_MODELS: AllowedModel[] = [
  { id: 'sonnet', label: 'Claude Sonnet' },
  { id: 'opus', label: 'Claude Opus' },
  { id: 'haiku', label: 'Claude Haiku' },
];

@Injectable()
export class AiPolicyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterModelsService: OpenRouterModelsService,
  ) {}

  getCuratedModels(): AllowedModel[] {
    return this.isClaudeCodeProvider() ? CLAUDE_CODE_MODELS : CURATED_MODELS;
  }

  getDefaultModel(): string {
    return this.isClaudeCodeProvider()
      ? CLAUDE_CODE_MODELS[0].id
      : DEFAULT_MODEL;
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

  /** Whether AI completions route through the local Claude Code CLI. */
  isClaudeCodeProvider(): boolean {
    return this.configService.get<string>('AI_PROVIDER') === 'claude-code';
  }

  async resolveEffectiveModel(params: {
    hasByok: boolean;
    requestedModel?: string;
    userActiveModel?: string;
    validationApiKey: string;
  }): Promise<string> {
    // Free (non-BYOK) users are always served the free-tier model, regardless
    // of any requested or previously stored model preference.
    // The claude-code provider serves Claude models the developer selects; the
    // OpenRouter catalog is irrelevant, so skip validation and honour the choice.
    if (this.isClaudeCodeProvider()) {
      return (
        params.requestedModel ??
        params.userActiveModel ??
        this.getDefaultModel()
      );
    }

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
    // No OpenRouter catalog to validate against when using Claude Code.
    if (this.isClaudeCodeProvider()) {
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
