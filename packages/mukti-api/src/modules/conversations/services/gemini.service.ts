import { Injectable, Logger } from '@nestjs/common';

import type { TechniqueTemplate } from '../../../schemas/technique.schema';
import { GeminiClientFactory } from '../../ai/services/gemini-client.factory';

export interface GeminiResponse {
  completionTokens: number;
  content: string;
  cost: number;
  model: string;
  promptTokens: number;
  totalTokens: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly geminiClientFactory: GeminiClientFactory) {}

  async sendMessage(params: {
    apiKey: string;
    conversationHistory: { content: string; role: string }[];
    model: string;
    technique: TechniqueTemplate;
    userMessage: string;
  }): Promise<GeminiResponse> {
    const client = this.geminiClientFactory.create(params.apiKey);
    const model = client.getGenerativeModel({ model: params.model });

    const historyText = params.conversationHistory
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join('\n\n');
    const prompt = [
      'You are Mukti, a Socratic thinking partner.',
      '',
      'System instructions:',
      params.technique.systemPrompt,
      '',
      'Conversation history:',
      historyText || '(none)',
      '',
      'Latest user message:',
      params.userMessage,
      '',
      'Reply as the assistant.',
    ].join('\n');

    this.logger.log(`Sending Gemini request with model: ${params.model}`);

    const generated = await model.generateContent(prompt);
    const response = generated.response;
    const content = response.text();
    const usage = (response as any).usageMetadata as
      | {
          candidatesTokenCount?: number;
          promptTokenCount?: number;
          totalTokenCount?: number;
        }
      | undefined;

    const promptTokens = usage?.promptTokenCount ?? 0;
    const completionTokens = usage?.candidatesTokenCount ?? 0;
    const totalTokens =
      usage?.totalTokenCount ?? promptTokens + completionTokens;

    return {
      completionTokens,
      content,
      cost: 0,
      model: params.model,
      promptTokens,
      totalTokens,
    };
  }
}
