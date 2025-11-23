import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Conversation,
  ConversationDocument,
  RecentMessage,
} from '../../../schemas/conversation.schema';

/**
 * Service responsible for managing messages within conversations.
 * Handles message operations, metadata updates, and archival logic.
 *
 * @remarks
 * This service manages the hybrid message storage approach where recent
 * messages are kept in-memory within the conversation document, and older
 * messages are archived to a separate collection when the threshold is exceeded.
 */
@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  /**
   * Maximum number of recent messages to keep in the conversation document.
   * When this threshold is exceeded, older messages are archived.
   */
  private readonly MAX_RECENT_MESSAGES = 50;

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  /**
   * Adds a user message and AI response to a conversation.
   * Updates conversation metadata including token counts, cost, and timestamps.
   * Increments the total message count.
   *
   * @param conversationId - The ID of the conversation
   * @param userMessage - The user's message content
   * @param aiResponse - The AI's response content
   * @param metadata - Optional metadata about the AI response (tokens, cost, latency, model)
   * @returns The updated conversation document
   *
   * @remarks
   * This method appends both the user message and AI response to the conversation's
   * recentMessages array. It updates the conversation metadata with token counts,
   * estimated cost, and the timestamp of the last message. The totalMessageCount
   * is incremented by 2 (one for user message, one for AI response).
   *
   * Requirements: 2.10, 2.11
   *
   * @example
   * ```typescript
   * const conversation = await messageService.addMessageToConversation(
   *   new Types.ObjectId('507f1f77bcf86cd799439011'),
   *   'How can I optimize React performance?',
   *   'What specific performance issues are you experiencing?',
   *   {
   *     model: 'gpt-5-mini',
   *     promptTokens: 150,
   *     completionTokens: 50,
   *     totalTokens: 200,
   *     latencyMs: 1200,
   *     cost: 0.0004
   *   }
   * );
   * ```
   */
  async addMessageToConversation(
    conversationId: string | Types.ObjectId,
    userMessage: string,
    aiResponse: string,
    metadata?: {
      completionTokens?: number;
      cost?: number;
      latencyMs?: number;
      model?: string;
      promptTokens?: number;
      totalTokens?: number;
    },
  ): Promise<ConversationDocument> {
    this.logger.log(
      `Adding messages to conversation ${conversationId.toString()}`,
    );

    try {
      const conversation =
        await this.conversationModel.findById(conversationId);

      if (!conversation) {
        throw new Error(
          `Conversation with ID ${conversationId.toString()} not found`,
        );
      }

      const timestamp = new Date();

      // Create user message
      const userMsg: RecentMessage = {
        content: userMessage,
        role: 'user',
        timestamp,
      };

      // Create AI response message with metadata
      const aiMsg: RecentMessage = {
        content: aiResponse,
        metadata: metadata
          ? {
              completionTokens: metadata.completionTokens,
              latencyMs: metadata.latencyMs,
              model: metadata.model,
              promptTokens: metadata.promptTokens,
              totalTokens: metadata.totalTokens,
            }
          : undefined,
        role: 'assistant',
        timestamp,
      };

      // Append both messages to recentMessages
      conversation.recentMessages.push(userMsg, aiMsg);

      // Increment totalMessageCount by 2 (user + assistant)
      conversation.totalMessageCount += 2;

      // Update metadata
      conversation.metadata.messageCount = conversation.totalMessageCount;
      conversation.metadata.lastMessageAt = timestamp;

      // Update token counts if provided
      if (metadata?.totalTokens) {
        conversation.metadata.totalTokens += metadata.totalTokens;
      }

      // Update estimated cost if provided
      if (metadata?.cost) {
        conversation.metadata.estimatedCost += metadata.cost;
      }

      // Save the updated conversation
      await conversation.save();

      this.logger.log(
        `Successfully added messages to conversation ${conversationId.toString()}. ` +
          `Total messages: ${conversation.totalMessageCount}, ` +
          `Recent messages: ${conversation.recentMessages.length}`,
      );

      return conversation;
    } catch (error) {
      this.logger.error(
        `Failed to add messages to conversation ${conversationId.toString()}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
