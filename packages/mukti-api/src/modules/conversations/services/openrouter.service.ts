import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouter } from '@openrouter/sdk';

import type { RecentMessage } from '../../../schemas/conversation.schema';
import type { TechniqueTemplate } from '../../../schemas/technique.schema';

/**
 * Error details when OpenRouter API request fails
 */
export interface OpenRouterError {
  code: string;
  message: string;
  retriable: boolean;
  stack?: string;
}

/**
 * Response from OpenRouter API after processing a chat completion request
 */
export interface OpenRouterResponse {
  completionTokens: number;
  content: string;
  cost: number;
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
 * Service responsible for integrating with OpenRouter API for AI-powered Socratic questioning.
 * Handles prompt building, model selection, API communication, and response parsing.
 *
 * @remarks
 * This service uses OpenRouter as a unified gateway to multiple AI models,
 * selecting appropriate models based on user subscription tiers and handling
 * all aspects of the request/response lifecycle including error handling and retries.
 */
@Injectable()
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly client: OpenRouter;
  private readonly logger = new Logger(OpenRouterService.name);
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
      this.logger.warn('OPENROUTER_API_KEY not configured');
    }

    // Initialize OpenRouter SDK client
    this.client = new OpenRouter({
      apiKey: this.apiKey,
    });
  }

  /**
   * Builds a complete prompt for the AI model including technique instructions and conversation history.
   *
   * @param technique - The Socratic technique template with system prompt and questioning style
   * @param conversationHistory - Array of previous messages in the conversation
   * @param userMessage - The current user message to respond to
   * @returns Array of messages formatted for OpenAI API
   *
   * @remarks
   * The prompt structure follows OpenAI's chat completion format with:
   * - System message containing the technique's instructions
   * - Historical messages for context
   * - Current user message
   */
  buildPrompt(
    technique: TechniqueTemplate,
    conversationHistory: RecentMessage[],
    userMessage: string,
  ): { content: string; role: 'assistant' | 'system' | 'user' }[] {
    const messages: {
      content: string;
      role: 'assistant' | 'system' | 'user';
    }[] = [];

    // Add system prompt from technique
    messages.push({
      content: technique.systemPrompt,
      role: 'system',
    });

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        content: msg.content,
        role: msg.role,
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
   * Handles errors from OpenRouter API and categorizes them as retriable or non-retriable.
   *
   * @param error - Error object from API call
   * @returns Structured error details with retriability information
   *
   * @remarks
   * Retriable errors include:
   * - Timeout errors
   * - 5xx server errors
   * - Network errors
   *
   * Non-retriable errors include:
   * - 4xx client errors (except 429 rate limit)
   * - Authentication errors
   * - Invalid request errors
   */
  handleError(error: unknown): OpenRouterError {
    const errorDetails: OpenRouterError = {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      retriable: false,
    };

    if (!this.isErrorWithDetails(error)) {
      return errorDetails;
    }

    const code = typeof error.code === 'string' ? error.code : undefined;
    const status = typeof error.status === 'number' ? error.status : undefined;
    const message =
      typeof error.message === 'string' ? error.message : undefined;
    const stack = typeof error.stack === 'string' ? error.stack : undefined;

    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      errorDetails.code = 'TIMEOUT';
      errorDetails.message = 'Request timed out';
      errorDetails.retriable = true;
    } else if (status !== undefined && status >= 500) {
      errorDetails.code = 'SERVER_ERROR';
      errorDetails.message = message ?? 'OpenRouter server error';
      errorDetails.retriable = true;
    } else if (status === 429) {
      errorDetails.code = 'RATE_LIMIT';
      errorDetails.message = 'Rate limit exceeded';
      errorDetails.retriable = true;
    } else if (status !== undefined && status >= 400 && status < 500) {
      errorDetails.code = 'CLIENT_ERROR';
      errorDetails.message = message ?? 'Invalid request';
      errorDetails.retriable = false;
    } else if (message) {
      errorDetails.message = message;
      errorDetails.retriable = false;
    }

    if (stack) {
      errorDetails.stack = stack;
    }

    return errorDetails;
  }

  /**
   * Parses the API response to extract content, token counts, and calculate cost.
   *
   * @param response - Raw response from OpenRouter API
   * @param model - Model identifier used for the request
   * @returns Structured response with all relevant data
   *
   * @remarks
   * Cost is calculated based on token usage and model-specific pricing.
   * Pricing is per 1M tokens and converted to actual cost.
   */
  parseResponse(response: unknown, model: string): OpenRouterResponse {
    const safeResponse = this.isChatResponsePayload(response)
      ? response
      : { choices: [], usage: undefined };

    const content = this.extractContent(safeResponse.choices?.[0]);
    const usage = safeResponse.usage;

    const promptTokens = usage?.promptTokens ?? usage?.prompt_tokens ?? 0;
    const completionTokens =
      usage?.completionTokens ?? usage?.completion_tokens ?? 0;
    const totalTokens = usage?.totalTokens ?? usage?.total_tokens ?? 0;

    // Calculate cost based on model pricing
    const cost = this.calculateCost(promptTokens, completionTokens, model);

    this.logger.log(
      `Response parsed: ${totalTokens} tokens, $${cost.toFixed(6)} cost`,
    );

    return {
      completionTokens,
      content,
      cost,
      model,
      promptTokens,
      totalTokens,
    };
  }

  /**
   * Selects the appropriate AI model based on user's subscription tier.
   *
   * @param subscriptionTier - User's subscription level ('free' or 'paid')
   * @returns Model identifier for OpenRouter API
   *
   * @remarks
   * - Free tier: Uses gpt-3.5-turbo for cost efficiency
   * - Paid tier: Uses gpt-4 for enhanced capabilities
   */
  selectModel(subscriptionTier: string): string {
    if (subscriptionTier === 'paid') {
      return 'openai/gpt-4';
    }
    return 'openai/gpt-3.5-turbo';
  }

  /**
   * Sends a chat completion request to OpenRouter API.
   *
   * @param messages - Array of messages formatted for the API
   * @param model - Model identifier to use
   * @param technique - Technique template for additional context
   * @returns Parsed response with content, tokens, and cost
   * @throws {Error} If API request fails after retries
   *
   * @remarks
   * - Includes HTTP-Referer and X-Title headers
   * - Handles API errors and provides detailed error information
   */
  async sendChatCompletion(
    messages: { content: string; role: 'assistant' | 'system' | 'user' }[],
    model: string,
    _technique: TechniqueTemplate,
  ): Promise<OpenRouterResponse> {
    try {
      this.logger.log(
        `Sending chat completion request to OpenRouter with model: ${model}`,
      );

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
            'X-Title': 'Mukti - Thinking Workspace',
          },
        },
      );

      return this.parseResponse(response, model);
    } catch (error) {
      const errorDetails = this.handleError(error);
      this.logger.error(
        `OpenRouter API error: ${errorDetails.message}`,
        errorDetails.stack,
      );
      throw error;
    }
  }

  /**
   * Calculates the cost of an API request based on token usage and model pricing.
   *
   * @param promptTokens - Number of tokens in the prompt
   * @param completionTokens - Number of tokens in the completion
   * @param model - Model identifier
   * @returns Cost in USD
   *
   * @remarks
   * Pricing is per 1M tokens. If model pricing is not found, returns 0.
   */
  private calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string,
  ): number {
    const pricing = this.modelPricing[model];

    if (!pricing) {
      this.logger.warn(`No pricing information for model: ${model}`);
      return 0;
    }

    const promptCost = (promptTokens / 1_000_000) * pricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * pricing.completion;

    return promptCost + completionCost;
  }

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

  private isErrorWithDetails(error: unknown): error is {
    code?: unknown;
    message?: unknown;
    stack?: unknown;
    status?: unknown;
  } {
    return this.isRecord(error);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
