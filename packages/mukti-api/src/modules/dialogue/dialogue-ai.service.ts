import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouter } from '@openrouter/sdk';

import type { ProblemStructure } from '../../schemas/canvas-session.schema';
import type { DialogueMessage } from '../../schemas/dialogue-message.schema';
import type { NodeType } from '../../schemas/node-dialogue.schema';

import {
  buildSystemPrompt,
  getRecommendedTechnique,
  type NodeContext,
} from './utils/prompt-builder';

/**
 * Response from AI service after generating a Socratic response.
 */
export interface DialogueAIResponse {
  completionTokens: number;
  content: string;
  cost: number;
  latencyMs: number;
  model: string;
  promptTokens: number;
  totalTokens: number;
}

interface ChatChoice {
  message?: {
    content?: ChatContentItem[] | null | string;
  };
}

interface ChatContentItem {
  text?: string;
  type?: string;
}

interface ChatResponsePayload {
  choices?: ChatChoice[];
  usage?: {
    completion_tokens?: number;
    completionTokens?: number;
    prompt_tokens?: number;
    promptTokens?: number;
    total_tokens?: number;
    totalTokens?: number;
  };
}

type ModelPricingTable = Partial<Record<string, Pricing>>;

interface Pricing {
  completion: number;
  prompt: number;
}

/**
 * Service responsible for AI-powered Socratic dialogue generation.
 * Uses OpenRouter API to generate context-aware responses for canvas node dialogues.
 *
 * @remarks
 * This service:
 * - Builds prompts using the prompt-builder utilities
 * - Integrates conversation history for context
 * - Selects appropriate models based on subscription tier
 * - Handles API communication and error handling
 */
@Injectable()
export class DialogueAIService {
  private readonly apiKey: string;
  private readonly client: OpenRouter;
  private readonly logger = new Logger(DialogueAIService.name);

  // Model pricing per 1M tokens (in USD)
  private readonly modelPricing: ModelPricingTable = {
    'openai/gpt-3.5-turbo': {
      completion: 2.0,
      prompt: 0.5,
    },
    'openai/gpt-4': {
      completion: 60.0,
      prompt: 30.0,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!this.apiKey) {
      this.logger.warn(
        'OPENROUTER_API_KEY not configured - AI responses will use fallback',
      );
    }

    this.client = new OpenRouter({
      apiKey: this.apiKey,
    });
  }

  /**
   * Generates a Socratic AI response for a node dialogue.
   *
   * @param nodeContext - The node being discussed (type, label, id)
   * @param problemStructure - The full problem structure from the canvas session
   * @param conversationHistory - Previous messages in this dialogue
   * @param userMessage - The current user message to respond to
   * @param subscriptionTier - User's subscription tier for model selection
   * @returns AI response with content, tokens, and cost
   */
  async generateResponse(
    nodeContext: NodeContext,
    problemStructure: ProblemStructure,
    conversationHistory: DialogueMessage[],
    userMessage: string,
    subscriptionTier = 'free',
  ): Promise<DialogueAIResponse> {
    const startTime = Date.now();

    // If API key is not configured, return fallback response
    if (!this.apiKey) {
      return this.generateFallbackResponse(nodeContext.nodeType, startTime);
    }

    try {
      // Get recommended technique for this node type
      const technique = getRecommendedTechnique(nodeContext.nodeType);

      // Build system prompt
      const systemPrompt = buildSystemPrompt(
        nodeContext,
        problemStructure,
        technique,
      );

      // Build messages array
      const messages = this.buildMessages(
        systemPrompt,
        conversationHistory,
        userMessage,
      );

      // Select model based on subscription tier
      const model = this.selectModel(subscriptionTier);

      this.logger.log(
        `Generating AI response for node ${nodeContext.nodeId} with model ${model}`,
      );

      // Send request to OpenRouter
      const response = await this.client.chat.send(
        {
          messages,
          model,
          stream: false,
          temperature: 0.7,
        },
        {
          headers: {
            'HTTP-Referer':
              this.configService.get<string>('APP_URL') ?? 'https://mukti.app',
            'X-Title': 'Mukti - Thinking Canvas',
          },
        },
      );

      const latencyMs = Date.now() - startTime;
      return this.parseResponse(response, model, latencyMs);
    } catch (error) {
      this.logger.error(
        `Failed to generate AI response: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      // Return fallback response on error
      return this.generateFallbackResponse(nodeContext.nodeType, startTime);
    }
  }

  /**
   * Checks if the AI service is available (API key configured).
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Builds the messages array for the OpenRouter API.
   */
  private buildMessages(
    systemPrompt: string,
    conversationHistory: DialogueMessage[],
    userMessage: string,
  ): { content: string; role: 'assistant' | 'system' | 'user' }[] {
    const messages: {
      content: string;
      role: 'assistant' | 'system' | 'user';
    }[] = [];

    // Add system prompt
    messages.push({
      content: systemPrompt,
      role: 'system',
    });

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        content: msg.content,
        role: msg.role as 'assistant' | 'user',
      });
    }

    // Add current user message
    messages.push({
      content: userMessage,
      role: 'user',
    });

    return messages;
  }

  /**
   * Calculates the cost based on token usage and model pricing.
   */
  private calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string,
  ): number {
    const pricing = this.modelPricing[model];

    if (!pricing) {
      return 0;
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Extracts content from the API response choice.
   */
  private extractContent(choice?: ChatChoice): string {
    const content = choice?.message?.content;

    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item) => this.extractTextFromContentItem(item))
        .filter((item) => item.length > 0)
        .join(' ');
    }

    return '';
  }

  private extractTextFromContentItem(item: ChatContentItem | string): string {
    if (typeof item === 'string') {
      return item;
    }

    if (item.type === 'text' && typeof item.text === 'string') {
      return item.text;
    }

    return '';
  }

  /**
   * Generates a fallback response when AI is unavailable.
   */
  private generateFallbackResponse(
    nodeType: NodeType,
    startTime: number,
  ): DialogueAIResponse {
    const responses: Record<NodeType, string[]> = {
      insight: [
        'How does this insight change your understanding of the original problem?',
        'What new questions does this discovery raise?',
        'How might you apply this insight going forward?',
      ],
      root: [
        "That's an interesting perspective. What evidence supports this assumption?",
        'Have you considered what might happen if this assumption were incorrect?',
        'What led you to believe this in the first place?',
      ],
      seed: [
        'What do you think is the underlying cause of this problem?',
        'How long has this been an issue, and what has changed?',
        'What would success look like if this problem were solved?',
      ],
      soil: [
        'Is this constraint truly fixed, or might there be flexibility?',
        'What would change if this constraint were removed?',
        'Have you explored ways to work within or around this limitation?',
      ],
    };

    const nodeResponses = responses[nodeType] || responses.seed;
    const content =
      nodeResponses[Math.floor(Math.random() * nodeResponses.length)];

    return {
      completionTokens: 0,
      content,
      cost: 0,
      latencyMs: Date.now() - startTime,
      model: 'fallback',
      promptTokens: 0,
      totalTokens: 0,
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }

  private isChatResponsePayload(
    response: unknown,
  ): response is ChatResponsePayload {
    if (!this.isRecord(response)) {
      return false;
    }

    const { choices, usage } = response;

    const usageValid = usage === undefined || this.isRecord(usage);
    const choicesValid =
      choices === undefined ||
      (Array.isArray(choices) &&
        choices.every((choice) => {
          if (!this.isRecord(choice)) {
            return false;
          }

          if (choice.message === undefined) {
            return true;
          }

          return this.isRecord(choice.message);
        }));

    return choicesValid && usageValid;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  /**
   * Parses the API response to extract content and token counts.
   */
  private parseResponse(
    response: unknown,
    model: string,
    latencyMs: number,
  ): DialogueAIResponse {
    const safeResponse = this.isChatResponsePayload(response)
      ? response
      : { choices: [], usage: undefined };

    const content = this.extractContent(safeResponse.choices?.[0]);
    const usage = safeResponse.usage;

    const promptTokens = usage?.promptTokens ?? usage?.prompt_tokens ?? 0;
    const completionTokens =
      usage?.completionTokens ?? usage?.completion_tokens ?? 0;
    const totalTokens = usage?.totalTokens ?? usage?.total_tokens ?? 0;

    const cost = this.calculateCost(promptTokens, completionTokens, model);

    this.logger.log(
      `AI response generated: ${totalTokens} tokens, $${cost.toFixed(6)} cost, ${latencyMs}ms`,
    );

    return {
      completionTokens,
      content:
        content || this.generateFallbackResponse('seed', Date.now()).content,
      cost,
      latencyMs,
      model,
      promptTokens,
      totalTokens,
    };
  }

  /**
   * Selects the appropriate AI model based on subscription tier.
   */
  private selectModel(subscriptionTier: string): string {
    if (subscriptionTier === 'paid') {
      return 'openai/gpt-4';
    }
    return 'openai/gpt-3.5-turbo';
  }
}
