import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import type { Subscription } from '../../schemas/subscription.schema';
import type { User } from '../../schemas/user.schema';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiCreateConversation,
  ApiDeleteConversation,
  ApiGetArchivedMessages,
  ApiGetConversationById,
  ApiGetConversations,
  ApiSendMessage,
  ApiStreamConversation,
  ApiUpdateConversation,
} from './dto/conversation.swagger';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { QueueService } from './services/queue.service';
import { StreamService } from './services/stream.service';

/**
 * Controller for conversation management endpoints.
 * Handles CRUD operations for conversations, message sending, and archived message retrieval.
 *
 * @remarks
 * All endpoints require JWT authentication.
 * Implements the Thinking Workspace paradigm for Socratic dialogues.
 */
@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly queueService: QueueService,
    private readonly streamService: StreamService,
  ) {}

  /**
   * Creates a new conversation with the specified Socratic technique.
   *
   * @param createConversationDto - The conversation creation data
   * @param user - The authenticated user from JWT token
   * @returns The newly created conversation
   */
  @ApiCreateConversation()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser() user: User,
  ) {
    const conversation = await this.conversationService.createConversation(
      user._id,
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
   * @param user - The authenticated user from JWT token
   * @returns Paginated list of conversations
   */
  @ApiGetConversations()
  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('technique') technique?: string,
    @Query('tags') tags?: string,
    @Query('isArchived') isArchived?: string,
    @Query('isFavorite') isFavorite?: string,
    @Query('sort') sort?: 'createdAt' | 'lastMessageAt' | 'updatedAt',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user._id;

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
   * @param user - The authenticated user from JWT token
   * @returns The conversation with recent messages
   */
  @ApiGetConversationById()
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const conversation = await this.conversationService.findConversationById(
      id,
      user._id,
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
   * @param user - The authenticated user from JWT token
   * @returns Array of archived messages
   */
  @ApiGetArchivedMessages()
  @Get(':id/messages/archived')
  async getArchivedMessages(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('beforeSequence') beforeSequence?: string,
  ) {
    // Validate conversation exists and user owns it
    await this.conversationService.findConversationById(id, user._id);

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
   * @param user - The authenticated user from JWT token
   * @returns No content (204)
   */
  @ApiDeleteConversation()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.conversationService.deleteConversation(id, user._id);

    // Return no content (204)
    return;
  }

  /**
   * Sends a message to a conversation and enqueues it for AI processing.
   * Checks rate limits before enqueueing.
   *
   * @param id - The conversation ID
   * @param sendMessageDto - The message content
   * @param user - The authenticated user from JWT token
   * @returns Job ID and queue position (202 Accepted)
   */
  @ApiSendMessage()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    // Validate conversation exists and user owns it
    const conversation = await this.conversationService.findConversationById(
      id,
      user._id,
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
    // Get subscription tier from user's subscription
    // Note: subscription is a virtual field that may not be populated
    // Default to 'free' if not available
    const userWithSubscription = user as User & { subscription?: Subscription };
    const subscriptionTier: 'free' | 'paid' =
      userWithSubscription.subscription?.tier === 'paid' ? 'paid' : 'free';

    const result = await this.queueService.enqueueRequest(
      user._id,
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
   * Establishes a Server-Sent Events (SSE) connection for real-time conversation updates.
   * The connection streams events including message processing status, new messages, completion, and errors.
   *
   * @param id - The conversation ID
   * @param user - The authenticated user from JWT token
   * @returns Observable stream of SSE MessageEvents
   *
   * @remarks
   * This endpoint:
   * - Validates user authentication via JWT guard
   * - Verifies user owns the conversation before establishing connection
   * - Returns an Observable that emits SSE events
   * - Sets appropriate SSE headers (Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive)
   * - Handles connection errors and returns appropriate HTTP status codes
   * - Automatically cleans up connection when client disconnects
   *
   * The stream emits events of types: 'processing', 'message', 'complete', 'error', 'progress'
   *
   * @example
   * ```typescript
   * // Client-side usage with EventSource
   * const eventSource = new EventSource('/api/v1/conversations/123/stream', {
   *   withCredentials: true // Include JWT token in cookies
   * });
   * eventSource.addEventListener('message', (event) => {
   *   const data = JSON.parse(event.data);
   *   console.log('Received event:', data);
   * });
   * ```
   */
  @ApiStreamConversation()
  @Sse(':id/stream')
  async streamConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    // Validate conversation exists and user owns it
    try {
      await this.conversationService.findConversationById(
        id,
        user._id.toString(),
      );
    } catch (error) {
      // Re-throw the error to let NestJS handle it with appropriate status code
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Conversation with ID ${id} not found`);
      }
      if (error instanceof ForbiddenException) {
        throw new ForbiddenException(
          'You do not have permission to access this conversation',
        );
      }
      throw error;
    }

    // Create an Observable that manages the SSE connection
    return new Observable<MessageEvent>((observer) => {
      // Generate unique connection ID
      const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Register the connection with StreamService
      this.streamService.addConnection(
        id,
        user._id.toString(),
        connectionId,
        (event) => {
          // Emit SSE event to the client
          observer.next({
            data: event,
            type: 'message',
          } as MessageEvent);
        },
      );

      // Handle client disconnect
      return () => {
        this.streamService.removeConnection(id, connectionId);
      };
    });
  }

  /**
   * Updates conversation properties with validation.
   *
   * @param id - The conversation ID
   * @param updateConversationDto - The fields to update
   * @param user - The authenticated user from JWT token
   * @returns The updated conversation
   */
  @ApiUpdateConversation()
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @CurrentUser() user: User,
  ) {
    const conversation = await this.conversationService.updateConversation(
      id,
      user._id,
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
