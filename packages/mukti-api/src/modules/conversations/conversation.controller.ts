import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';

import {
  ApiCreateConversation,
  ApiDeleteConversation,
  ApiGetArchivedMessages,
  ApiGetConversationById,
  ApiGetConversations,
  ApiSendMessage,
  ApiUpdateConversation,
} from './dto/conversation.swagger';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { QueueService } from './services/queue.service';

/**
 * Controller for conversation management endpoints.
 * Handles CRUD operations for conversations, message sending, and archived message retrieval.
 *
 * @remarks
 * All endpoints require JWT authentication (to be implemented).
 * Implements the Thinking Workspace paradigm for Socratic dialogues.
 *
 * Requirements: All conversation-related requirements (1.x, 2.x, 3.x, 4.x, 5.x, 6.x)
 */
@ApiTags('Conversations')
@Controller('conversations')
// @UseGuards(JwtAuthGuard) // TODO: Implement JWT authentication guard
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Creates a new conversation with the specified Socratic technique.
   *
   * @param createConversationDto - The conversation creation data
   * @param req - The request object containing authenticated user info
   * @returns The newly created conversation
   *
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  @ApiCreateConversation()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() createConversationDto: CreateConversationDto,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    // For now, using a placeholder userId
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    const conversation = await this.conversationService.createConversation(
      userId,
      createConversationDto.title,
      createConversationDto.technique,
      createConversationDto.tags,
    );

    return {
      data: conversation,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Lists conversations for the authenticated user with filtering, sorting, and pagination.
   *
   * @param technique - Optional filter by Socratic technique
   * @param tags - Optional filter by tags (comma-separated)
   * @param isArchived - Optional filter by archived status
   * @param isFavorite - Optional filter by favorite status
   * @param sort - Sort field (createdAt, updatedAt, lastMessageAt)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @param req - The request object containing authenticated user info
   * @returns Paginated list of conversations
   *
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  @ApiGetConversations()
  @Get()
  async findAll(
    @Query('technique') technique?: string,
    @Query('tags') tags?: string,
    @Query('isArchived') isArchived?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('sort') sort?: 'createdAt' | 'lastMessageAt' | 'updatedAt',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    // Parse query parameters
    const filters: {
      isArchived?: boolean;
      isFavorite?: boolean;
      tags?: string[];
      technique?: string;
    } = {};

    if (technique) {
      filters.technique = technique;
    }

    if (tags) {
      filters.tags = tags.split(',').map((tag) => tag.trim());
    }

    if (isArchived !== undefined) {
      filters.isArchived = isArchived === 'true';
    }

    if (isFavorite !== undefined) {
      filters.isFavorite = isFavorite === 'true';
    }

    const pageNumber = page ? Number.parseInt(page, 10) : 1;
    const limitNumber = limit ? Number.parseInt(limit, 10) : 20;
    const sortField = sort ?? 'updatedAt';

    const result = await this.conversationService.findUserConversations(
      userId,
      filters,
      sortField,
      pageNumber,
      limitNumber,
    );

    return {
      data: result.data,
      meta: result.meta,
      success: true,
    };
  }

  /**
   * Retrieves a specific conversation by ID with ownership validation.
   *
   * @param id - The conversation ID
   * @param req - The request object containing authenticated user info
   * @returns The conversation with recent messages
   *
   * Requirements: 3.1, 3.4, 3.5
   */
  @ApiGetConversationById()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    const conversation = await this.conversationService.findConversationById(
      id,
      userId,
    );

    return {
      data: conversation,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Retrieves archived messages for a conversation with pagination.
   *
   * @param id - The conversation ID
   * @param limit - Maximum number of messages to return
   * @param beforeSequence - Retrieve messages before this sequence number
   * @param req - The request object containing authenticated user info
   * @returns Array of archived messages
   *
   * Requirements: 3.2, 3.3
   */
  @ApiGetArchivedMessages()
  @Get(':id/messages/archived')
  async getArchivedMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('beforeSequence') beforeSequence?: string,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    // Validate conversation exists and user owns it
    await this.conversationService.findConversationById(id, userId);

    // Parse query parameters
    const limitNumber = limit ? Number.parseInt(limit, 10) : 50;
    const beforeSequenceNumber = beforeSequence
      ? Number.parseInt(beforeSequence, 10)
      : undefined;

    const messages = await this.messageService.getArchivedMessages(id, {
      beforeSequence: beforeSequenceNumber,
      limit: limitNumber,
    });

    return {
      data: messages,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Deletes a conversation and all associated archived messages.
   *
   * @param id - The conversation ID
   * @param req - The request object containing authenticated user info
   * @returns No content (204)
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  @ApiDeleteConversation()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    await this.conversationService.deleteConversation(id, userId);

    // Return no content (204)
    return;
  }

  /**
   * Sends a message to a conversation and enqueues it for AI processing.
   * Checks rate limits before enqueueing.
   *
   * @param id - The conversation ID
   * @param sendMessageDto - The message content
   * @param req - The request object containing authenticated user info
   * @returns Job ID and queue position (202 Accepted)
   *
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   */
  @ApiSendMessage()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    // Validate conversation exists and user owns it
    const conversation = await this.conversationService.findConversationById(
      id,
      userId,
    );

    // TODO: Check rate limits via RateLimitService
    // const rateLimitStatus = await this.rateLimitService.checkRateLimit(userId);
    // if (!rateLimitStatus.allowed) {
    //   throw new HttpException(
    //     {
    //       success: false,
    //       error: {
    //         code: 'RATE_LIMIT_EXCEEDED',
    //         message: rateLimitStatus.message,
    //         retryAfter: rateLimitStatus.retryAfter,
    //       },
    //       meta: {
    //         timestamp: new Date().toISOString(),
    //       },
    //     },
    //     HttpStatus.TOO_MANY_REQUESTS,
    //   );
    // }

    // Enqueue request for processing
    // TODO: Get actual subscription tier from user
    const subscriptionTier = 'free'; // Placeholder

    const result = await this.queueService.enqueueRequest(
      userId,
      id,
      sendMessageDto.content,
      subscriptionTier,
      conversation.technique,
    );

    return {
      data: {
        jobId: result.jobId,
        position: result.position,
      },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Updates conversation properties with validation.
   *
   * @param id - The conversation ID
   * @param updateConversationDto - The fields to update
   * @param req - The request object containing authenticated user info
   * @returns The updated conversation
   *
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  @ApiUpdateConversation()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    // @Request() req: any, // TODO: Extract userId from JWT token
  ) {
    // TODO: Extract userId from authenticated request
    const userId = new Types.ObjectId('507f1f77bcf86cd799439012');

    const conversation = await this.conversationService.updateConversation(
      id,
      userId,
      updateConversationDto,
    );

    return {
      data: conversation,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Generates a unique request ID for tracking.
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
