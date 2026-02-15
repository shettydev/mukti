import { Injectable } from '@nestjs/common';

import type { AiProvider } from '../../../schemas/ai-provider-config.schema';

import { calculateAiCostUsd } from './ai-cost.service';
import { AiConfigService } from './ai-config.service';
import { AnthropicProviderService } from './providers/anthropic-provider.service';
import { GeminiProviderService } from './providers/gemini-provider.service';
import { OpenAiProviderService } from './providers/openai-provider.service';
import { OpenRouterProviderService } from './providers/openrouter-provider.service';
import type {
  AiChatMessage,
  AiProviderCompletionResult,
} from './providers/provider.types';

export interface AiGatewayResponse {
  completionTokens: number;
  content: string;
  costUsd: number;
  latencyMs: number;
  model: string;
  promptTokens: number;
  provider: AiProvider;
  totalTokens: number;
}

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly openAiProviderService: OpenAiProviderService,
    private readonly anthropicProviderService: AnthropicProviderService,
    private readonly geminiProviderService: GeminiProviderService,
    private readonly openRouterProviderService: OpenRouterProviderService,
  ) {}

  async createChatCompletion(params: {
    messages: AiChatMessage[];
    modelId: string;
  }): Promise<AiGatewayResponse> {
    const modelConfig = await this.aiConfigService.getModelForGeneration(
      params.modelId,
    );

    const start = Date.now();

    const providerResponse = await this.callProvider({
      apiKey: modelConfig.apiKey,
      messages: params.messages,
      model: modelConfig.providerModel,
      provider: modelConfig.provider,
    });

    const costUsd = calculateAiCostUsd({
      completionTokens: providerResponse.completionTokens,
      pricing: modelConfig.pricing,
      promptTokens: providerResponse.promptTokens,
    });

    return {
      completionTokens: providerResponse.completionTokens,
      content: providerResponse.content,
      costUsd,
      latencyMs: Date.now() - start,
      model: modelConfig.id,
      promptTokens: providerResponse.promptTokens,
      provider: modelConfig.provider,
      totalTokens:
        providerResponse.totalTokens ||
        providerResponse.promptTokens + providerResponse.completionTokens,
    };
  }

  private async callProvider(params: {
    apiKey: string;
    messages: AiChatMessage[];
    model: string;
    provider: AiProvider;
  }): Promise<AiProviderCompletionResult> {
    if (params.provider === 'openai') {
      return this.openAiProviderService.createChatCompletion({
        apiKey: params.apiKey,
        messages: params.messages,
        model: params.model,
      });
    }

    if (params.provider === 'anthropic') {
      return this.anthropicProviderService.createChatCompletion({
        apiKey: params.apiKey,
        messages: params.messages,
        model: params.model,
      });
    }

    if (params.provider === 'gemini') {
      return this.geminiProviderService.createChatCompletion({
        apiKey: params.apiKey,
        messages: params.messages,
        model: params.model,
      });
    }

    return this.openRouterProviderService.createChatCompletion({
      apiKey: params.apiKey,
      messages: params.messages,
      model: params.model,
    });
  }
}
