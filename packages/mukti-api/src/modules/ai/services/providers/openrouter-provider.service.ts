import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OpenRouterClientFactory } from '../openrouter-client.factory';

import type {
  AiChatMessage,
  AiProviderCompletionResult,
} from './provider.types';

interface OpenRouterChatChoice {
  message?: {
    content?: OpenRouterContentPart[] | null | string;
  };
}

interface OpenRouterContentPart {
  text?: string;
  type?: string;
}

interface OpenRouterResponsePayload {
  choices?: OpenRouterChatChoice[];
  usage?: {
    completion_tokens?: number;
    completionTokens?: number;
    prompt_tokens?: number;
    promptTokens?: number;
    total_tokens?: number;
    totalTokens?: number;
  };
}

@Injectable()
export class OpenRouterProviderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterClientFactory: OpenRouterClientFactory,
  ) {}

  async createChatCompletion(params: {
    apiKey: string;
    messages: AiChatMessage[];
    model: string;
  }): Promise<AiProviderCompletionResult> {
    const client = this.openRouterClientFactory.create(params.apiKey);

    const response = await client.chat.send(
      {
        messages: params.messages,
        model: params.model,
        stream: false,
        temperature: 0.7,
      },
      {
        headers: {
          'HTTP-Referer':
            this.configService.get<string>('APP_URL') ?? 'https://mukti.app',
          'X-Title': 'Mukti - Thinking Workspace',
        },
      },
    );

    const safeResponse = this.isResponsePayload(response)
      ? response
      : { choices: [], usage: undefined };

    const usage = safeResponse.usage;
    const promptTokens = usage?.promptTokens ?? usage?.prompt_tokens ?? 0;
    const completionTokens =
      usage?.completionTokens ?? usage?.completion_tokens ?? 0;
    const totalTokens =
      usage?.totalTokens ??
      usage?.total_tokens ??
      promptTokens + completionTokens;

    return {
      completionTokens,
      content: this.extractContent(safeResponse.choices?.[0]),
      promptTokens,
      totalTokens,
    };
  }

  private extractContent(choice?: OpenRouterChatChoice): string {
    const content = choice?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') {
            return part;
          }

          if (part.type === 'text' && typeof part.text === 'string') {
            return part.text;
          }

          return '';
        })
        .filter((part) => part.length > 0)
        .join(' ');
    }

    return '';
  }

  private isResponsePayload(
    payload: unknown,
  ): payload is OpenRouterResponsePayload {
    return typeof payload === 'object' && payload !== null;
  }
}
