import { Injectable } from '@nestjs/common';

import type {
  AiChatMessage,
  AiProviderCompletionResult,
} from './provider.types';

interface GeminiResponsePayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
  usageMetadata?: {
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
}

@Injectable()
export class GeminiProviderService {
  async createChatCompletion(params: {
    apiKey: string;
    messages: AiChatMessage[];
    model: string;
  }): Promise<AiProviderCompletionResult> {
    const systemInstruction = params.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n')
      .trim();

    const contents = params.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        parts: [{ text: message.content }],
        role: message.role === 'assistant' ? 'model' : 'user',
      }));

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

    const response = await fetch(endpoint, {
      body: JSON.stringify({
        ...(systemInstruction
          ? {
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
            }
          : {}),
        contents,
        generationConfig: {
          temperature: 0.7,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const payload = (await response.json()) as GeminiResponsePayload;

    if (!response.ok) {
      const message =
        payload.error?.message ??
        `Gemini request failed with status ${response.status}`;
      throw new Error(message);
    }

    const promptTokens = payload.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = payload.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens =
      payload.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

    const content =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .filter((part) => part.length > 0)
        .join(' ') ?? '';

    return {
      completionTokens,
      content,
      promptTokens,
      totalTokens,
    };
  }
}
