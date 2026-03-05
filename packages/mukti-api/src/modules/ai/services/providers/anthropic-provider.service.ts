import { Injectable } from '@nestjs/common';

import type {
  AiChatMessage,
  AiProviderCompletionResult,
} from './provider.types';

interface AnthropicResponsePayload {
  content?: Array<{
    text?: string;
    type?: string;
  }>;
  error?: {
    message?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

@Injectable()
export class AnthropicProviderService {
  async createChatCompletion(params: {
    apiKey: string;
    messages: AiChatMessage[];
    model: string;
  }): Promise<AiProviderCompletionResult> {
    const systemMessage = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')
      .trim();

    const dialogueMessages = params.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        content: message.content,
        role: message.role,
      }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      body: JSON.stringify({
        max_tokens: 1024,
        messages: dialogueMessages,
        model: params.model,
        ...(systemMessage ? { system: systemMessage } : {}),
        temperature: 0.7,
      }),
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': params.apiKey,
      },
      method: 'POST',
    });

    const payload = (await response.json()) as AnthropicResponsePayload;

    if (!response.ok) {
      const message =
        payload.error?.message ??
        `Anthropic request failed with status ${response.status}`;
      throw new Error(message);
    }

    const promptTokens = payload.usage?.input_tokens ?? 0;
    const completionTokens = payload.usage?.output_tokens ?? 0;

    return {
      completionTokens,
      content: this.extractContent(payload.content),
      promptTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private extractContent(
    content:
      | Array<{
          text?: string;
          type?: string;
        }>
      | undefined,
  ): string {
    if (!content?.length) {
      return '';
    }

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
}
