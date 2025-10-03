import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class OpenRouterService {
  private readonly client: AxiosInstance;
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const baseUrl = this.configService.get<string>('OPENROUTER_BASE_URL');
    this.defaultModel =
      this.configService.get<string>('DEFAULT_AI_MODEL') ??
      'anthropic/claude-3-sonnet';

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://mukti-api.local',
        'X-Title': 'Mukti API - Thinking Workspace',
        'Content-Type': 'application/json',
      },
    });
  }

  async generateCompletion(
    messages: OpenRouterMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    },
  ): Promise<string> {
    try {
      const request: OpenRouterRequest = {
        model: options?.model ?? this.defaultModel,
        messages,
        max_tokens: options?.maxTokens ?? 1000,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      };

      const response = await this.client.post<OpenRouterResponse>(
        '/chat/completions',
        request,
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No completion generated');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `OpenRouter API error: ${error.response?.data?.error?.message ?? error.message}`,
        );
      }
      throw error;
    }
  }

  async generateSocraticQuestions(
    technique: string,
    context: string,
    currentUnderstanding: string,
    domain: string,
    complexity: string,
  ): Promise<{
    questions: string[];
    explorationPaths: string[];
    nextSteps: string[];
  }> {
    const systemPrompt = this.buildSocraticSystemPrompt(
      technique,
      domain,
      complexity,
    );

    const userPrompt = `
Context: ${context}
Current Understanding: ${currentUnderstanding}

Generate a set of Socratic questions using the ${technique} technique that will guide deeper inquiry into this topic. Focus on helping the user discover insights rather than providing direct answers.

Respond with a JSON object containing:
- questions: array of 3-5 thoughtful questions
- explorationPaths: array of 2-3 suggested investigation directions
- nextSteps: array of 2-3 recommended next actions
`;

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.generateCompletion(messages, {
      temperature: 0.8,
      maxTokens: 800,
    });

    try {
      return JSON.parse(response);
    } catch (_error) {
      // Fallback parsing if JSON is malformed
      return this.parseSocraticResponse(response);
    }
  }

  private buildSocraticSystemPrompt(
    technique: string,
    domain: string,
    complexity: string,
  ): string {
    const basePrompt = `You are a Socratic inquiry expert specializing in the ${technique} technique. Your role is to guide learning through thoughtful questioning rather than providing direct answers.

Domain: ${domain}
Complexity Level: ${complexity}

Technique Guidelines:
- elenchus: Use cross-examination to expose gaps in understanding and assumptions
- maieutics: Help "birth" ideas through careful questioning that draws out latent knowledge
- dialectic: Guide systematic reasoning through opposing viewpoints
- aporia: Create productive confusion that motivates deeper inquiry
- irony: Use feigned ignorance to encourage independent thinking

Your questions should:
1. Challenge assumptions
2. Reveal inconsistencies
3. Guide toward deeper understanding
4. Encourage self-reflection
5. Promote independent discovery

Always respond with valid JSON format.`;

    return basePrompt;
  }

  private parseSocraticResponse(response: string): {
    questions: string[];
    explorationPaths: string[];
    nextSteps: string[];
  } {
    // Fallback parser for non-JSON responses
    const questions = this.extractListFromText(
      response,
      /questions?:?\s*\n?([\s\S]*?)(?=exploration|next|$)/i,
    );
    const explorationPaths = this.extractListFromText(
      response,
      /exploration.*?paths?:?\s*\n?([\s\S]*?)(?=next|questions|$)/i,
    );
    const nextSteps = this.extractListFromText(
      response,
      /next.*?steps?:?\s*\n?([\s\S]*?)(?=questions|exploration|$)/i,
    );

    return {
      questions:
        questions.length > 0
          ? questions
          : ['What assumptions are you making about this problem?'],
      explorationPaths:
        explorationPaths.length > 0
          ? explorationPaths
          : ['Analyze the root causes'],
      nextSteps:
        nextSteps.length > 0
          ? nextSteps
          : ['Define the problem more precisely'],
    };
  }

  private extractListFromText(text: string, regex: RegExp): string[] {
    const match = text.match(regex);
    if (!match) return [];

    const section = match[1];
    const lines = section
      .split('\n')
      .map(line => line.replace(/^[\s\-*\d.)+]+/, '').trim())
      .filter(
        line =>
          line.length > 0 && !/^(questions?|exploration|next)/i.exec(line),
      );

    return lines.slice(0, 5); // Limit to 5 items
  }
}
