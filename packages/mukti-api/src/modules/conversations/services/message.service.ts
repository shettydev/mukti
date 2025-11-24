import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ArchivedMessage,
  ArchivedMessageDocument,
} from '../../../schemas/archived-message.schema';
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
    @InjectModel(ArchivedMessage.name)
    private archivedMessageModel: Model<ArchivedMessageDocument>,
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

      // Mark modified paths for Mongoose to track changes
      conversation.markModified('recentMessages');
      conversation.markModified('metadata');

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

  /**
   * Archives old messages when the conversation exceeds the maximum recent message threshold.
   * Moves the oldest messages to the ArchivedMessage collection and keeps only the last 50
   * messages in the conversation's recentMessages array.
   *
   * @param conversationId - The ID of the conversation to archive messages for
   * @returns The updated conversation document
   *
   * @remarks
   * This method is called when the recentMessages array exceeds 50 messages. It:
   * 1. Checks if recentMessages exceeds the threshold (50 messages)
   * 2. Calculates how many messages need to be archived
   * 3. Moves the oldest messages to the ArchivedMessage collection with sequence numbers
   * 4. Sets the hasArchivedMessages flag to true
   * 5. Keeps only the last 50 messages in recentMessages
   *
   * Sequence numbers are assigned based on the current highest sequence number in the
   * ArchivedMessage collection for this conversation, ensuring proper ordering.
   *
   * Requirements: 2.12, 2.13
   *
   * @example
   * ```typescript
   * // After adding messages that exceed the threshold
   * const conversation = await messageService.archiveOldMessages(
   *   new Types.ObjectId('507f1f77bcf86cd799439011')
   * );
   * console.log(conversation.hasArchivedMessages); // true
   * console.log(conversation.recentMessages.length); // 50
   * ```
   */
  async archiveOldMessages(
    conversationId: string | Types.ObjectId,
  ): Promise<ConversationDocument> {
    this.logger.log(
      `Checking if archival is needed for conversation ${conversationId.toString()}`,
    );

    try {
      const conversation =
        await this.conversationModel.findById(conversationId);

      if (!conversation) {
        throw new Error(
          `Conversation with ID ${conversationId.toString()} not found`,
        );
      }

      // Check if recentMessages exceeds the threshold
      if (conversation.recentMessages.length <= this.MAX_RECENT_MESSAGES) {
        this.logger.log(
          `No archival needed for conversation ${conversationId.toString()}. ` +
            `Current message count: ${conversation.recentMessages.length}`,
        );
        return conversation;
      }

      // Calculate how many messages need to be archived
      const messagesToArchive =
        conversation.recentMessages.length - this.MAX_RECENT_MESSAGES;

      this.logger.log(
        `Archiving ${messagesToArchive} messages from conversation ${conversationId.toString()}`,
      );

      // Get the current highest sequence number for this conversation
      const lastArchivedMessage = await this.archivedMessageModel
        .findOne({ conversationId })
        .sort({ sequenceNumber: -1 })
        .exec();

      let nextSequenceNumber = lastArchivedMessage
        ? lastArchivedMessage.sequenceNumber + 1
        : 1;

      // Extract the oldest messages to archive
      const oldestMessages = conversation.recentMessages.slice(
        0,
        messagesToArchive,
      );

      // Create archived message documents with sequence numbers
      const archivedMessageDocs = oldestMessages.map((message) => ({
        content: message.content,
        conversationId: new Types.ObjectId(conversationId.toString()),
        isEdited: false,
        metadata: message.metadata
          ? {
              completionTokens: message.metadata.completionTokens,
              latencyMs: message.metadata.latencyMs,
              model: message.metadata.model,
              promptTokens: message.metadata.promptTokens,
              totalTokens: message.metadata.totalTokens,
            }
          : undefined,
        role: message.role,
        sequenceNumber: nextSequenceNumber++,
        timestamp: message.timestamp,
      }));

      // Insert archived messages into the ArchivedMessage collection
      await this.archivedMessageModel.insertMany(archivedMessageDocs);

      // Keep only the last MAX_RECENT_MESSAGES in recentMessages
      conversation.recentMessages = conversation.recentMessages.slice(
        -this.MAX_RECENT_MESSAGES,
      );

      // Set the hasArchivedMessages flag to true
      conversation.hasArchivedMessages = true;

      // Mark modified path for Mongoose to track changes
      conversation.markModified('recentMessages');

      // Save the updated conversation
      await conversation.save();

      this.logger.log(
        `Successfully archived ${messagesToArchive} messages from conversation ${conversationId.toString()}. ` +
          `Remaining recent messages: ${conversation.recentMessages.length}`,
      );

      return conversation;
    } catch (error) {
      this.logger.error(
        `Failed to archive messages for conversation ${conversationId.toString()}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Builds conversation context for AI prompt generation.
   * Loads recent messages from the conversation and includes the technique template.
   *
   * @param conversation - The conversation document
   * @param techniqueTemplate - The technique template containing systemPrompt and other settings
   * @returns Formatted context object ready for AI prompt building
   *
   * @remarks
   * This method prepares the conversation context needed for generating AI prompts.
   * It formats the recent messages into a structure suitable for the AI API and
   * includes the technique's system prompt and configuration.
   *
   * The returned context includes:
   * - systemPrompt: The technique's system prompt that defines AI behavior
   * - messages: Array of recent messages formatted for the AI API
   * - technique: The technique configuration (questioning style, follow-up strategy, etc.)
   *
   * Requirements: 2.6, 2.7
   *
   * @example
   * ```typescript
   * const context = messageService.buildConversationContext(
   *   conversation,
   *   {
   *     systemPrompt: 'You are a Socratic questioner...',
   *     questioningStyle: 'Challenging and probing',
   *     followUpStrategy: 'Identify contradictions',
   *     exampleQuestions: ['What do you mean by...?']
   *   }
   * );
   * // Returns:
   * // {
   * //   systemPrompt: 'You are a Socratic questioner...',
   * //   messages: [
   * //     { role: 'user', content: 'How can I...?' },
   * //     { role: 'assistant', content: 'What have you tried...?' }
   * //   ],
   * //   technique: { questioningStyle: '...', followUpStrategy: '...', ... }
   * // }
   * ```
   */
  buildConversationContext(
    conversation: ConversationDocument,
    techniqueTemplate: {
      conversationFlow?: string[];
      exampleQuestions: string[];
      followUpStrategy: string;
      maxQuestionsPerTopic?: number;
      questioningStyle: string;
      systemPrompt: string;
    },
  ): {
    messages: { content: string; role: string }[];
    systemPrompt: string;
    technique: {
      conversationFlow?: string[];
      exampleQuestions: string[];
      followUpStrategy: string;
      maxQuestionsPerTopic?: number;
      questioningStyle: string;
    };
  } {
    this.logger.log(
      `Building conversation context for conversation ${conversation._id.toString()}`,
    );

    try {
      // Format recent messages for AI prompt
      const messages = conversation.recentMessages.map((message) => ({
        content: message.content,
        role: message.role,
      }));

      // Build context object
      const context = {
        messages,
        systemPrompt: techniqueTemplate.systemPrompt,
        technique: {
          conversationFlow: techniqueTemplate.conversationFlow,
          exampleQuestions: techniqueTemplate.exampleQuestions,
          followUpStrategy: techniqueTemplate.followUpStrategy,
          maxQuestionsPerTopic: techniqueTemplate.maxQuestionsPerTopic,
          questioningStyle: techniqueTemplate.questioningStyle,
        },
      };

      this.logger.log(
        `Built conversation context with ${messages.length} messages and technique: ${conversation.technique}`,
      );

      return context;
    } catch (error) {
      this.logger.error(
        `Failed to build conversation context for conversation ${conversation._id.toString()}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves archived messages for a conversation with pagination support.
   * Messages are ordered by sequence number in ascending order.
   *
   * @param conversationId - The ID of the conversation
   * @param options - Pagination options
   * @param options.limit - Maximum number of messages to return (default: 50)
   * @param options.beforeSequence - Optional sequence number to retrieve messages before
   * @returns Array of archived messages ordered by sequence number ascending
   *
   * @remarks
   * This method retrieves archived messages from the ArchivedMessage collection.
   * Messages are ordered by sequenceNumber in ascending order to maintain chronological
   * order. The beforeSequence parameter allows for cursor-based pagination, retrieving
   * messages that occurred before a specific sequence number.
   *
   * Requirements: 3.2, 3.3
   *
   * @example
   * ```typescript
   * // Get first 50 archived messages
   * const messages = await messageService.getArchivedMessages(
   *   new Types.ObjectId('507f1f77bcf86cd799439011')
   * );
   *
   * // Get next 50 messages before sequence 100
   * const olderMessages = await messageService.getArchivedMessages(
   *   new Types.ObjectId('507f1f77bcf86cd799439011'),
   *   { beforeSequence: 100, limit: 50 }
   * );
   * ```
   */
  async getArchivedMessages(
    conversationId: string | Types.ObjectId,
    options?: {
      beforeSequence?: number;
      limit?: number;
    },
  ): Promise<ArchivedMessageDocument[]> {
    const limit = options?.limit ?? 50;
    const beforeSequence = options?.beforeSequence;

    this.logger.log(
      `Retrieving archived messages for conversation ${conversationId.toString()}` +
        (beforeSequence ? ` before sequence ${beforeSequence}` : '') +
        ` (limit: ${limit})`,
    );

    try {
      // Build query
      const query: {
        conversationId: Types.ObjectId;
        sequenceNumber?: { $lt: number };
      } = {
        conversationId: new Types.ObjectId(conversationId.toString()),
      };

      // Add beforeSequence filter if provided
      if (beforeSequence !== undefined) {
        query.sequenceNumber = { $lt: beforeSequence };
      }

      // Retrieve messages ordered by sequenceNumber ascending
      const messages = await this.archivedMessageModel
        .find(query)
        .sort({ sequenceNumber: 1 })
        .limit(limit)
        .exec();

      this.logger.log(
        `Retrieved ${messages.length} archived messages for conversation ${conversationId.toString()}`,
      );

      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve archived messages for conversation ${conversationId.toString()}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
