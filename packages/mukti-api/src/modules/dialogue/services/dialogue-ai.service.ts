import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ProblemStructure } from '../../../schemas/canvas-session.schema';
import type { DialogueMessage } from '../../../schemas/dialogue-message.schema';
import type { NodeType } from '../../../schemas/node-dialogue.schema';
import type { QualityDirectives } from '../../dialogue-quality/interfaces/quality.interface';
import type { ScaffoldContext } from '../../scaffolding/interfaces/scaffolding.interface';

import { OpenRouterClientFactory } from '../../ai/services/openrouter-client.factory';
import {
  appendQualityGuardrails,
  buildScaffoldAwarePrompt,
  buildSystemPrompt,
  getRecommendedTechnique,
  type NodeContext,
} from '../utils/prompt-builder';
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
  private readonly logger = new Logger(DialogueAIService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterClientFactory: OpenRouterClientFactory,
  ) {}

  /**
   * Generates a Socratic AI response for a node dialogue.
   *
   * @param nodeContext - The node being discussed (type, label, id)
   * @param problemStructure - The full problem structure from the canvas session
   * @param conversationHistory - Previous messages in this dialogue
   * @param userMessage - The current user message to respond to
   * @param model - OpenRouter model id
   * @param apiKey - OpenRouter API key
   * @returns AI response with content, tokens, and cost
   */
  async generateResponse(
    nodeContext: NodeContext,
    problemStructure: ProblemStructure,
    conversationHistory: DialogueMessage[],
    userMessage: string,
    model: string,
    apiKey: string,
  ): Promise<DialogueAIResponse> {
    const startTime = Date.now();

    if (!apiKey) {
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

      const effectiveModel = model.trim();

      this.logger.log(
        `Generating AI response for node ${nodeContext.nodeId} with model ${effectiveModel}`,
      );

      const client = this.openRouterClientFactory.create(apiKey);

      // Send request to OpenRouter
      const response = await client.chat.send(
        {
          messages,
          model: effectiveModel,
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
      return this.parseResponse(response, effectiveModel, latencyMs);
    } catch (error) {
      // If the SDK's strict Zod validation failed but we got a raw response,
      // try our more lenient parser before falling back
      if (this.isResponseValidationError(error)) {
        this.logger.warn(
          `OpenRouter SDK response validation failed for model ${model}, attempting lenient parse`,
        );
        try {
          return this.parseResponse(
            error.rawValue,
            model.trim(),
            Date.now() - startTime,
          );
        } catch {
          // Lenient parse also failed — fall through to fallback
        }
      }

      this.logger.error(
        `Failed to generate AI response: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      // Return fallback response on error
      return this.generateFallbackResponse(nodeContext.nodeType, startTime);
    }
  }

  /**
   * Generates a scaffold-aware Socratic AI response for a node dialogue.
   * This is the primary method when scaffolding is enabled.
   *
   * @param nodeContext - The node being discussed (type, label, id)
   * @param problemStructure - The full problem structure from the canvas session
   * @param conversationHistory - Previous messages in this dialogue
   * @param userMessage - The current user message to respond to
   * @param model - OpenRouter model id
   * @param apiKey - OpenRouter API key
   * @param scaffoldContext - Optional scaffold context from gap detection
   * @returns AI response with content, tokens, and cost
   */
  async generateScaffoldedResponse(
    nodeContext: NodeContext,
    problemStructure: ProblemStructure,
    conversationHistory: DialogueMessage[],
    userMessage: string,
    model: string,
    apiKey: string,
    scaffoldContext?: ScaffoldContext,
    qualityDirectives?: QualityDirectives,
  ): Promise<DialogueAIResponse> {
    const startTime = Date.now();

    if (!apiKey) {
      return this.generateFallbackResponse(nodeContext.nodeType, startTime);
    }

    try {
      // Get recommended technique for this node type
      const technique = getRecommendedTechnique(nodeContext.nodeType);

      // Build scaffold-aware system prompt with quality guardrails
      const systemPrompt = buildScaffoldAwarePrompt(
        nodeContext,
        problemStructure,
        scaffoldContext,
        technique,
        qualityDirectives,
      );

      // Build messages array
      const messages = this.buildMessages(
        systemPrompt,
        conversationHistory,
        userMessage,
      );

      const effectiveModel = model.trim();

      const scaffoldLevel = scaffoldContext?.level ?? 'none';
      this.logger.log(
        `Generating scaffolded AI response for node ${nodeContext.nodeId} with model ${effectiveModel} (scaffold level: ${scaffoldLevel})`,
      );

      const client = this.openRouterClientFactory.create(apiKey);

      // Send request to OpenRouter
      const response = await client.chat.send(
        {
          messages,
          model: effectiveModel,
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
      return this.parseResponse(response, effectiveModel, latencyMs);
    } catch (error) {
      if (this.isResponseValidationError(error)) {
        this.logger.warn(
          `OpenRouter SDK response validation failed for model ${model}, attempting lenient parse`,
        );
        try {
          return this.parseResponse(
            error.rawValue,
            model.trim(),
            Date.now() - startTime,
          );
        } catch {
          // Lenient parse also failed — fall through to fallback
        }
      }

      this.logger.error(
        `Failed to generate scaffolded AI response: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      // Return fallback response on error
      return this.generateFallbackResponse(nodeContext.nodeType, startTime);
    }
  }

  /**
   * Generates a Socratic AI response using a pre-built system prompt.
   * Used by ThoughtMap dialogues where the system prompt is constructed externally
   * (e.g., using `buildThoughtMapSystemPrompt`) rather than from a ProblemStructure.
   *
   * @param systemPrompt - The fully-constructed system prompt
   * @param conversationHistory - Previous messages in this dialogue
   * @param userMessage - The current user message to respond to
   * @param model - OpenRouter model id
   * @param apiKey - OpenRouter API key
   * @param scaffoldContext - Optional scaffold context from gap detection
   * @returns AI response with content, tokens, and cost
   */
  async generateScaffoldedResponseWithPrompt(
    systemPrompt: string,
    conversationHistory: DialogueMessage[],
    userMessage: string,
    model: string,
    apiKey: string,
    scaffoldContext?: ScaffoldContext,
    qualityDirectives?: QualityDirectives,
  ): Promise<DialogueAIResponse> {
    const startTime = Date.now();

    if (!apiKey) {
      return this.generateFallbackResponse('seed', startTime);
    }

    try {
      // Optionally augment with scaffold instructions
      let finalPrompt = scaffoldContext
        ? this.augmentPromptWithScaffoldInstructions(
            systemPrompt,
            scaffoldContext,
          )
        : systemPrompt;

      // RFC-0004: Append quality guardrails
      finalPrompt = appendQualityGuardrails(finalPrompt, qualityDirectives);

      const messages = this.buildMessages(
        finalPrompt,
        conversationHistory,
        userMessage,
      );
      const effectiveModel = model.trim();

      this.logger.log(
        `Generating ThoughtMap AI response with model ${effectiveModel} (scaffold level: ${scaffoldContext?.level ?? 'none'})`,
      );

      const client = this.openRouterClientFactory.create(apiKey);

      const response = await client.chat.send(
        { messages, model: effectiveModel, stream: false, temperature: 0.7 },
        {
          headers: {
            'HTTP-Referer':
              this.configService.get<string>('APP_URL') ?? 'https://mukti.app',
            'X-Title': 'Mukti - Thought Map',
          },
        },
      );

      const latencyMs = Date.now() - startTime;
      return this.parseResponse(response, effectiveModel, latencyMs);
    } catch (error) {
      if (this.isResponseValidationError(error)) {
        this.logger.warn(
          `OpenRouter SDK response validation failed for model ${model}, attempting lenient parse`,
        );
        try {
          return this.parseResponse(
            error.rawValue,
            model.trim(),
            Date.now() - startTime,
          );
        } catch {
          // Lenient parse also failed — fall through to fallback
        }
      }

      this.logger.error(
        `Failed to generate ThoughtMap AI response: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      return this.generateFallbackResponse('thought', startTime);
    }
  }

  /**
   * Inline scaffold augmentation for pre-built prompts.
   * Extracts only the scaffold addendum from `buildScaffoldAwarePrompt` and appends
   * it to the provided base prompt, avoiding any dependency on ProblemStructure.
   */
  private augmentPromptWithScaffoldInstructions(
    basePrompt: string,
    context: ScaffoldContext,
  ): string {
    // Generate augmentation using a stub node + problem to extract just the scaffold addendum
    const stubNode = {
      nodeId: '_stub',
      nodeLabel: '',
      nodeType: 'thought' as const,
    };
    const stubProblem = { roots: [], seed: '', soil: [] };
    const augmented = buildScaffoldAwarePrompt(stubNode, stubProblem, context);

    const separator = '\n---\nSCAFFOLDING LEVEL:';
    const scaffoldIdx = augmented.indexOf(separator);
    if (scaffoldIdx === -1) {
      return basePrompt;
    }

    return `${basePrompt}${augmented.slice(scaffoldIdx)}`;
  }

  /**
   * Builds the messages array for the OpenRouter API.
   * Skips the user message when empty (e.g. initial question generation
   * where the system prompt already contains all instructions).
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

    // Add current user message (skip when empty — e.g. initial question generation)
    if (userMessage) {
      messages.push({
        content: userMessage,
        role: 'user',
      });
    }

    return messages;
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
      question: [
        'What draws you to explore this question?',
        'What would answering this question unlock for you?',
        'What do you already know that might shed light on this?',
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
      thought: [
        'What assumptions are embedded in this thought?',
        'How does this connect to what you already know?',
        'What would change your view on this?',
      ],
      topic: [
        'What aspect of this topic feels most unresolved?',
        'Why does this topic matter to you right now?',
        'What do you hope to discover by exploring this?',
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

  private isResponseValidationError(
    error: unknown,
  ): error is { rawValue: unknown } {
    if (!this.isRecord(error)) {
      return false;
    }

    return error.name === 'ResponseValidationError' && 'rawValue' in error;
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

    const cost = 0;

    this.logger.log(
      `AI response generated: ${totalTokens} tokens, ${latencyMs}ms`,
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
}
