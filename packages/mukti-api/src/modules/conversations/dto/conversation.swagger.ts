import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { CreateConversationDto } from './create-conversation.dto';
import { SendMessageDto } from './send-message.dto';
import { UpdateConversationDto } from './update-conversation.dto';

/**
 * Swagger documentation for creating a new conversation
 */
export const ApiCreateConversation = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Creates a new Socratic dialogue session with the specified technique',
      summary: 'Create a new conversation',
    }),
    ApiBearerAuth(),
    ApiBody({ type: CreateConversationDto }),
    ApiResponse({
      description: 'Conversation successfully created',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            createdAt: '2026-01-01T00:00:00Z',
            hasArchivedMessages: false,
            isArchived: false,
            isFavorite: false,
            metadata: {
              estimatedCost: 0,
              messageCount: 0,
              totalTokens: 0,
            },
            recentMessages: [],
            tags: ['react', 'performance'],
            technique: 'elenchus',
            title: 'React Performance Optimization',
            totalMessageCount: 0,
            updatedAt: '2026-01-01T00:00:00Z',
            userId: '507f1f77bcf86cd799439012',
          },
          meta: {
            requestId: 'uuid',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 201,
    }),
    ApiResponse({
      description: 'Invalid input data or technique',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: {
              technique: ['technique must be one of: elenchus, dialectic...'],
            },
            message: 'Validation failed',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 400,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for listing conversations
 */
export const ApiGetConversations = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves a paginated list of conversations for the authenticated user with optional filtering and sorting',
      summary: 'List user conversations',
    }),
    ApiBearerAuth(),
    ApiQuery({
      description: 'Filter by Socratic technique',
      example: 'elenchus',
      name: 'technique',
      required: false,
      type: String,
    }),
    ApiQuery({
      description: 'Filter by tags (comma-separated)',
      example: 'react,performance',
      name: 'tags',
      required: false,
      type: String,
    }),
    ApiQuery({
      description: 'Filter by archived status',
      example: false,
      name: 'isArchived',
      required: false,
      type: Boolean,
    }),
    ApiQuery({
      description: 'Filter by favorite status',
      example: true,
      name: 'isFavorite',
      required: false,
      type: Boolean,
    }),
    ApiQuery({
      description: 'Sort field',
      enum: ['createdAt', 'updatedAt', 'lastMessageAt'],
      example: 'updatedAt',
      name: 'sort',
      required: false,
    }),
    ApiQuery({
      description: 'Page number',
      example: 1,
      name: 'page',
      required: false,
      type: Number,
    }),
    ApiQuery({
      description: 'Items per page',
      example: 20,
      name: 'limit',
      required: false,
      type: Number,
    }),
    ApiResponse({
      description: 'Conversations retrieved successfully',
      schema: {
        example: {
          data: [
            {
              _id: '507f1f77bcf86cd799439011',
              createdAt: '2026-01-01T00:00:00Z',
              metadata: {
                estimatedCost: 0.0012,
                lastMessageAt: '2026-01-01T01:00:00Z',
                messageCount: 10,
                totalTokens: 500,
              },
              tags: ['react'],
              technique: 'elenchus',
              title: 'React Performance',
              updatedAt: '2026-01-01T01:00:00Z',
            },
          ],
          meta: {
            limit: 20,
            page: 1,
            total: 100,
            totalPages: 5,
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for getting a conversation by ID
 */
export const ApiGetConversationById = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves a specific conversation by ID with ownership validation',
      summary: 'Get conversation by ID',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Conversation ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Conversation found',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            createdAt: '2026-01-01T00:00:00Z',
            hasArchivedMessages: false,
            metadata: {
              estimatedCost: 0.0012,
              lastMessageAt: '2026-01-01T01:00:00Z',
              messageCount: 10,
              totalTokens: 500,
            },
            recentMessages: [
              {
                content: 'How can I optimize React?',
                role: 'user',
                timestamp: '2026-01-01T00:30:00Z',
              },
              {
                content: 'What specific performance issues are you facing?',
                role: 'assistant',
                timestamp: '2026-01-01T00:30:05Z',
              },
            ],
            tags: ['react'],
            technique: 'elenchus',
            title: 'React Performance',
            totalMessageCount: 10,
            updatedAt: '2026-01-01T01:00:00Z',
            userId: '507f1f77bcf86cd799439012',
          },
          meta: {
            requestId: 'uuid',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this conversation',
      schema: {
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this conversation',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 403,
    }),
    ApiResponse({
      description: 'Conversation not found',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation with ID 507f1f77bcf86cd799439011 not found',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 404,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for updating a conversation
 */
export const ApiUpdateConversation = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Updates conversation properties including title, tags, favorite status, archived status, and technique',
      summary: 'Update conversation',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Conversation ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: UpdateConversationDto }),
    ApiResponse({
      description: 'Conversation updated successfully',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            isFavorite: true,
            tags: ['react', 'performance', 'hooks'],
            technique: 'dialectic',
            title: 'React Performance - Updated',
            updatedAt: '2026-01-01T02:00:00Z',
          },
          meta: {
            requestId: 'uuid',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Invalid input data',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            message: 'Title cannot be empty',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 400,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this conversation',
      status: 403,
    }),
    ApiResponse({
      description: 'Conversation not found',
      status: 404,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for deleting a conversation
 */
export const ApiDeleteConversation = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Permanently deletes a conversation and all associated archived messages',
      summary: 'Delete conversation',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Conversation ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Conversation deleted successfully',
      status: 204,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this conversation',
      schema: {
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this conversation',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 403,
    }),
    ApiResponse({
      description: 'Conversation not found',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation with ID 507f1f77bcf86cd799439011 not found',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 404,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for sending a message to a conversation
 */
export const ApiSendMessage = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Sends a message to a conversation and enqueues it for AI processing with rate limit checking',
      summary: 'Send message to conversation',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Conversation ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: SendMessageDto }),
    ApiResponse({
      description: 'Message enqueued successfully',
      schema: {
        example: {
          data: {
            jobId: 'job-123-abc',
            position: 5,
          },
          meta: {
            requestId: 'uuid',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 202,
    }),
    ApiResponse({
      description: 'Invalid message content',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: {
              content: ['content should not be empty'],
            },
            message: 'Validation failed',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 400,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this conversation',
      status: 403,
    }),
    ApiResponse({
      description: 'Conversation not found',
      status: 404,
    }),
    ApiResponse({
      description: 'Rate limit exceeded',
      schema: {
        example: {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Daily question limit reached',
            retryAfter: 3600,
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 429,
    }),
  );

/**
 * Swagger documentation for getting archived messages
 */
export const ApiGetArchivedMessages = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves archived messages for a conversation with pagination support',
      summary: 'Get archived messages',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Conversation ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiQuery({
      description: 'Maximum number of messages to return',
      example: 50,
      name: 'limit',
      required: false,
      type: Number,
    }),
    ApiQuery({
      description: 'Retrieve messages before this sequence number',
      example: 100,
      name: 'beforeSequence',
      required: false,
      type: Number,
    }),
    ApiResponse({
      description: 'Archived messages retrieved successfully',
      schema: {
        example: {
          data: [
            {
              _id: '507f1f77bcf86cd799439013',
              content: 'How can I optimize React?',
              conversationId: '507f1f77bcf86cd799439011',
              role: 'user',
              sequenceNumber: 1,
              timestamp: '2026-01-01T00:00:00Z',
            },
            {
              _id: '507f1f77bcf86cd799439014',
              content: 'What specific issues are you facing?',
              conversationId: '507f1f77bcf86cd799439011',
              metadata: {
                completionTokens: 50,
                model: 'gpt-5-mini',
                promptTokens: 150,
                totalTokens: 200,
              },
              role: 'assistant',
              sequenceNumber: 2,
              timestamp: '2026-01-01T00:00:05Z',
            },
          ],
          meta: {
            requestId: 'uuid',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this conversation',
      status: 403,
    }),
    ApiResponse({
      description: 'Conversation not found',
      status: 404,
    }),
  );

/**
 * Swagger documentation for SSE stream endpoint
 */
export const ApiStreamConversation = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Establishes a Server-Sent Events (SSE) connection for real-time conversation updates. ' +
        'The connection streams events including message processing status, new messages, completion, and errors. ' +
        'The stream remains open until the client disconnects or navigates away.',
      summary: 'Stream conversation updates via SSE',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Conversation ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description:
        'SSE connection established successfully. Events will be streamed in text/event-stream format.',
      schema: {
        example: {
          description:
            'Server-Sent Events stream. Example events:\n\n' +
            'event: message\n' +
            'data: {"type":"processing","data":{"jobId":"job-123","status":"started"},"conversationId":"507f1f77bcf86cd799439011","timestamp":"2026-01-01T00:00:00Z"}\n\n' +
            'event: message\n' +
            'data: {"type":"message","data":{"role":"assistant","content":"What do you mean?","timestamp":"2026-01-01T00:00:05Z","sequence":5},"conversationId":"507f1f77bcf86cd799439011","timestamp":"2026-01-01T00:00:05Z"}\n\n' +
            'event: message\n' +
            'data: {"type":"complete","data":{"jobId":"job-123","tokens":200,"cost":0.0004,"latency":5000},"conversationId":"507f1f77bcf86cd799439011","timestamp":"2026-01-01T00:00:10Z"}\n\n',
          eventTypes: {
            complete: {
              data: {
                cost: 0.0004,
                jobId: 'job-123',
                latency: 5000,
                tokens: 200,
              },
              description: 'Message processing completed successfully',
              type: 'complete',
            },
            error: {
              data: {
                code: 'PROCESSING_ERROR',
                message: 'Failed to generate response',
                retriable: true,
              },
              description: 'An error occurred during processing',
              type: 'error',
            },
            message: {
              data: {
                content: 'What do you mean by that?',
                role: 'assistant',
                sequence: 5,
                timestamp: '2026-01-01T00:00:05Z',
                tokens: 50,
              },
              description: 'New message received (user or assistant)',
              type: 'message',
            },
            processing: {
              data: {
                jobId: 'job-123',
                status: 'started',
              },
              description: 'Message processing has started',
              type: 'processing',
            },
            progress: {
              data: {
                jobId: 'job-123',
                position: 3,
                status: 'Generating response...',
              },
              description: 'Progress update during processing',
              type: 'progress',
            },
          },
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      schema: {
        example: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this conversation',
      schema: {
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this conversation',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 403,
    }),
    ApiResponse({
      description: 'Conversation not found',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message: 'Conversation with ID 507f1f77bcf86cd799439011 not found',
          },
          meta: {
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: false,
        },
      },
      status: 404,
    }),
  );
