import { Injectable } from '@nestjs/common';

import type {
  AiChatMessage,
  AiProviderCompletionResult,
} from './provider.types';

interface OpenAiResponsePayload {
  choices?: Array<{
    message?: {
      content?:
        | Array<{
            text?: string;
            type?: string;
          }>
        | null
        | string;
    };
  }>;
  error?: {
    message?: string;
  };
  usage?: {
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
  };
}

@Injectable()
export class OpenAiProviderService {
  async createChatCompletion(params: {
    apiKey: string;
    messages: AiChatMessage[];
    model: string;
  }): Promise<AiProviderCompletionResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      body: JSON.stringify({
        messages: params.messages,
        model: params.model,
        temperature: 0.7,
      }),
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const payload = (await response.json()) as OpenAiResponsePayload;

    if (!response.ok) {
      const message =
        payload.error?.message ??
        `OpenAI request failed with status ${response.status}`;
      throw new Error(message);
    }

    const promptTokens = payload.usage?.prompt_tokens ?? 0;
    const completionTokens = payload.usage?.completion_tokens ?? 0;
    const totalTokens =
      payload.usage?.total_tokens ?? promptTokens + completionTokens;

    return {
      completionTokens,
      content: this.extractContent(payload.choices?.[0]?.message?.content),
      promptTokens,
      totalTokens,
    };
  }

  private extractContent(
    content:
      | Array<{
          text?: string;
          type?: string;
        }>
      | null
      | string
      | undefined,
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
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
}
