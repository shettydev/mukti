import { Injectable, Logger } from '@nestjs/common';

import type { ProblemStructure } from '../../schemas/canvas-session.schema';
import type { DialogueMessage } from '../../schemas/dialogue-message.schema';
import type { NodeType } from '../../schemas/node-dialogue.schema';
import type { AiProvider } from '../../schemas/ai-provider-config.schema';

import { AiGatewayService } from '../ai/services/ai-gateway.service';
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
  provider: AiProvider | 'system';
  totalTokens: number;
}

/**
 * Service responsible for AI-powered Socratic dialogue generation.
 * Routes all requests through the backend AI gateway.
 */
@Injectable()
export class DialogueAIService {
  private readonly logger = new Logger(DialogueAIService.name);

  constructor(private readonly aiGatewayService: AiGatewayService) {}

  /**
   * Generates a Socratic AI response for a node dialogue.
   */
  async generateResponse(
    nodeContext: NodeContext,
    problemStructure: ProblemStructure,
    conversationHistory: DialogueMessage[],
    userMessage: string,
    model: string,
  ): Promise<DialogueAIResponse> {
    const startTime = Date.now();

    try {
      const technique = getRecommendedTechnique(nodeContext.nodeType);
      const systemPrompt = buildSystemPrompt(
        nodeContext,
        problemStructure,
        technique,
      );

      const messages = this.buildMessages(
        systemPrompt,
        conversationHistory,
        userMessage,
      );

      this.logger.log(
        `Generating AI response for node ${nodeContext.nodeId} with model ${model}`,
      );

      const response = await this.aiGatewayService.createChatCompletion({
        messages,
        modelId: model,
      });

      return {
        completionTokens: response.completionTokens,
        content:
          response.content ||
          this.generateFallbackResponse('seed', Date.now()).content,
        cost: response.costUsd,
        latencyMs: response.latencyMs,
        model: response.model,
        promptTokens: response.promptTokens,
        provider: response.provider,
        totalTokens: response.totalTokens,
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate AI response: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );

      return this.generateFallbackResponse(nodeContext.nodeType, startTime);
    }
  }

  /**
   * Builds the messages array for the AI gateway.
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

    messages.push({
      content: systemPrompt,
      role: 'system',
    });

    for (const msg of conversationHistory) {
      messages.push({
        content: msg.content,
        role: msg.role as 'assistant' | 'user',
      });
    }

    messages.push({
      content: userMessage,
      role: 'user',
    });

    return messages;
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
      provider: 'system',
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
}
