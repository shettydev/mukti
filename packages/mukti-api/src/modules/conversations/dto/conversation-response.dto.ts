import type { Types } from 'mongoose';

import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

import type { Conversation } from '../../../schemas/conversation.schema';

/**
 * Metadata for conversation analytics and tracking.
 */
export class ConversationMetadataDto {
  @ApiProperty({
    description: 'Average latency in milliseconds',
    example: 1500,
    required: false,
  })
  @Expose()
  averageLatencyMs?: number;

  @ApiProperty({
    description: 'Estimated cost in USD',
    example: 0.0012,
  })
  @Expose()
  estimatedCost: number;

  @ApiProperty({
    description: 'ID of conversation this was forked from',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @Expose()
  forkedFrom?: string;

  @ApiProperty({
    description: 'Timestamp of last message',
    example: '2026-01-01T01:00:00Z',
    required: false,
  })
  @Expose()
  lastMessageAt?: Date;

  @ApiProperty({
    description: 'Total number of messages',
    example: 10,
  })
  @Expose()
  messageCount: number;

  @ApiProperty({
    description: 'Total tokens used',
    example: 500,
  })
  @Expose()
  totalTokens: number;
}

/**
 * DTO for conversation response.
 *
 * @remarks
 * Maps conversation document to response format, excluding sensitive fields
 * like internal database IDs and share tokens (unless explicitly needed).
 */
export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '507f1f77bcf86cd799439011',
  })
  @Expose()
  _id: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-01T00:00:00Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Whether conversation has archived messages',
    example: false,
  })
  @Expose()
  hasArchivedMessages: boolean;

  @ApiProperty({
    description: 'Whether conversation is archived',
    example: false,
  })
  @Expose()
  isArchived: boolean;

  @ApiProperty({
    description: 'Whether conversation is marked as favorite',
    example: true,
  })
  @Expose()
  isFavorite: boolean;

  @ApiProperty({
    description: 'Whether conversation is publicly shared',
    example: false,
  })
  @Expose()
  isShared: boolean;

  @ApiProperty({
    description: 'Conversation metadata and analytics',
    type: ConversationMetadataDto,
  })
  @Expose()
  @Type(() => ConversationMetadataDto)
  metadata: ConversationMetadataDto;

  @Exclude()
  oldestMessageId?: Types.ObjectId;

  @ApiProperty({
    description: 'Recent messages (last 50)',
    isArray: true,
    type: () => RecentMessageDto,
  })
  @Expose()
  @Type(() => RecentMessageDto)
  recentMessages: RecentMessageDto[];

  @Exclude()
  shareToken?: string;

  @ApiProperty({
    description: 'Tags for organizing the conversation',
    example: ['react', 'performance'],
    isArray: true,
    type: String,
  })
  @Expose()
  tags: string[];

  @ApiProperty({
    description: 'Socratic technique used',
    enum: [
      'analogical',
      'counterfactual',
      'definitional',
      'dialectic',
      'elenchus',
      'maieutics',
    ],
    example: 'elenchus',
  })
  @Expose()
  technique: string;

  @ApiProperty({
    description: 'Conversation title',
    example: 'React Performance Optimization',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'Total message count including archived',
    example: 75,
  })
  @Expose()
  totalMessageCount: number;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-01T01:00:00Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'User ID who owns the conversation',
    example: '507f1f77bcf86cd799439012',
  })
  @Expose()
  userId: string;

  /**
   * Static factory method to create DTO from conversation document.
   *
   * @param conversation - The conversation document
   * @returns Formatted conversation response DTO
   */
  static fromDocument(conversation: Conversation): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto._id = conversation._id?.toString() ?? String(conversation._id);
    dto.userId = conversation.userId?.toString() ?? String(conversation.userId);
    dto.title = conversation.title;
    dto.technique = conversation.technique;
    dto.tags = conversation.tags ?? [];
    dto.recentMessages = conversation.recentMessages ?? [];
    dto.hasArchivedMessages = conversation.hasArchivedMessages ?? false;
    dto.totalMessageCount = conversation.totalMessageCount ?? 0;

    // Map metadata with proper type conversion
    const metadata = conversation.metadata ?? {
      estimatedCost: 0,
      messageCount: 0,
      totalTokens: 0,
    };
    dto.metadata = {
      averageLatencyMs: metadata.averageLatencyMs,
      estimatedCost: metadata.estimatedCost,
      forkedFrom: metadata.forkedFrom?.toString(),
      lastMessageAt: metadata.lastMessageAt,
      messageCount: metadata.messageCount,
      totalTokens: metadata.totalTokens,
    };

    dto.isFavorite = conversation.isFavorite ?? false;
    dto.isArchived = conversation.isArchived ?? false;
    dto.isShared = conversation.isShared ?? false;
    dto.createdAt = conversation.createdAt;
    dto.updatedAt = conversation.updatedAt;

    return dto;
  }
}

/**
 * Message metadata for AI responses.
 */
export class MessageMetadataDto {
  @ApiProperty({
    description: 'Completion tokens used',
    example: 50,
    required: false,
  })
  @Expose()
  completionTokens?: number;

  @ApiProperty({
    description: 'Latency in milliseconds',
    example: 1200,
    required: false,
  })
  @Expose()
  latencyMs?: number;

  @ApiProperty({
    description: 'AI model used',
    example: 'gpt-5-mini',
    required: false,
  })
  @Expose()
  model?: string;

  @ApiProperty({
    description: 'Prompt tokens used',
    example: 150,
    required: false,
  })
  @Expose()
  promptTokens?: number;

  @ApiProperty({
    description: 'Total tokens used',
    example: 200,
    required: false,
  })
  @Expose()
  totalTokens?: number;
}

/**
 * DTO for paginated conversation list response.
 */
export class PaginatedConversationsResponseDto {
  @ApiProperty({
    description: 'Array of conversations',
    isArray: true,
    type: () => ConversationResponseDto,
  })
  @Expose()
  @Type(() => ConversationResponseDto)
  data: ConversationResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      limit: 20,
      page: 1,
      total: 100,
      totalPages: 5,
    },
  })
  @Expose()
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Recent message in a conversation.
 */
export class RecentMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'How can I optimize React component rendering?',
  })
  @Expose()
  content: string;

  @ApiProperty({
    description: 'Message metadata',
    required: false,
    type: () => MessageMetadataDto,
  })
  @Expose()
  @Type(() => MessageMetadataDto)
  metadata?: MessageMetadataDto;

  @ApiProperty({
    description: 'Message role',
    enum: ['assistant', 'system', 'user'],
    example: 'user',
  })
  @Expose()
  role: 'assistant' | 'system' | 'user';

  @ApiProperty({
    description: 'Message timestamp',
    example: '2026-01-01T00:30:00Z',
  })
  @Expose()
  timestamp: Date;
}
