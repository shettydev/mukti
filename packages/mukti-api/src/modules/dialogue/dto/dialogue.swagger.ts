import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { SendMessageDto } from './send-message.dto';

/**
 * Swagger documentation for sending a message to a node dialogue
 */
export const ApiSendNodeMessage = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Sends a message to a node dialogue and enqueues it for AI processing. Returns immediately with job ID. Use the SSE stream endpoint to receive real-time updates.',
      summary: 'Send message to node dialogue',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'sessionId',
    }),
    ApiParam({
      description: 'Node identifier (e.g., seed, soil-0, root-1, insight-0)',
      example: 'root-0',
      name: 'nodeId',
    }),
    ApiBody({ type: SendMessageDto }),
    ApiResponse({
      description: 'Message enqueued for processing',
      schema: {
        example: {
          data: {
            jobId: 'job-123456',
            position: 1,
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
      description: 'Invalid input data',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: {
              content: ['Message content must not be empty'],
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
      description: 'Forbidden - User does not own this canvas session',
      schema: {
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this canvas session',
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
      description: 'Canvas session not found',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message:
              'Canvas session with ID 507f1f77bcf86cd799439011 not found',
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

/**
 * Swagger documentation for SSE stream endpoint
 */
export const ApiStreamNodeDialogue = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Establishes a Server-Sent Events (SSE) connection for real-time dialogue updates. Events include: processing (started), progress (status updates), message (user/assistant messages), complete (job finished), error (processing failed).',
      summary: 'Stream node dialogue events (SSE)',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'sessionId',
    }),
    ApiParam({
      description: 'Node identifier (e.g., seed, soil-0, root-1, insight-0)',
      example: 'root-0',
      name: 'nodeId',
    }),
    ApiResponse({
      description: 'SSE stream established. Events are sent as JSON objects.',
      schema: {
        example: {
          data: {
            content:
              "That's an interesting perspective. What evidence supports this?",
            role: 'assistant',
            sequence: 1,
            timestamp: '2026-01-01T00:00:01Z',
            tokens: 45,
          },
          dialogueId: '507f1f77bcf86cd799439012',
          nodeId: 'root-0',
          sessionId: '507f1f77bcf86cd799439011',
          timestamp: '2026-01-01T00:00:01Z',
          type: 'message',
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this canvas session',
      status: 403,
    }),
    ApiResponse({
      description: 'Canvas session not found',
      status: 404,
    }),
  );

/**
 * Swagger documentation for getting dialogue messages with pagination
 */
export const ApiGetNodeMessages = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves the dialogue history for a specific node with pagination support. Returns empty array if no dialogue exists.',
      summary: 'Get node dialogue messages',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'sessionId',
    }),
    ApiParam({
      description: 'Node identifier (e.g., seed, soil-0, root-1, insight-0)',
      example: 'root-0',
      name: 'nodeId',
    }),
    ApiQuery({
      description: 'Page number (1-indexed)',
      example: 1,
      name: 'page',
      required: false,
      type: Number,
    }),
    ApiQuery({
      description: 'Number of messages per page (max 100)',
      example: 20,
      name: 'limit',
      required: false,
      type: Number,
    }),
    ApiResponse({
      description: 'Dialogue messages retrieved successfully',
      schema: {
        example: {
          data: {
            dialogue: {
              createdAt: '2026-01-01T00:00:00Z',
              id: '507f1f77bcf86cd799439012',
              lastMessageAt: '2026-01-01T00:00:01Z',
              messageCount: 10,
              nodeId: 'root-0',
              nodeLabel: 'We need to hire more people',
              nodeType: 'root',
              sessionId: '507f1f77bcf86cd799439011',
            },
            messages: [
              {
                content: 'I believe this assumption is valid because...',
                dialogueId: '507f1f77bcf86cd799439012',
                id: '507f1f77bcf86cd799439013',
                role: 'user',
                sequence: 0,
                timestamp: '2026-01-01T00:00:00Z',
              },
              {
                content:
                  "That's an interesting perspective. What evidence do you have?",
                dialogueId: '507f1f77bcf86cd799439012',
                id: '507f1f77bcf86cd799439014',
                metadata: {
                  latencyMs: 1500,
                  model: 'gpt-4',
                  tokens: 45,
                },
                role: 'assistant',
                sequence: 1,
                timestamp: '2026-01-01T00:00:01Z',
              },
            ],
            pagination: {
              hasMore: false,
              limit: 20,
              page: 1,
              total: 10,
              totalPages: 1,
            },
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
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this canvas session',
      schema: {
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this canvas session',
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
      description: 'Canvas session not found',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message:
              'Canvas session with ID 507f1f77bcf86cd799439011 not found',
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

/**
 * Swagger documentation for starting a new dialogue with initial AI question
 */
export const ApiStartNodeDialogue = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Starts a new dialogue for a node by generating an initial Socratic question. Creates the dialogue if it does not exist.',
      summary: 'Start node dialogue with initial question',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'sessionId',
    }),
    ApiParam({
      description: 'Node identifier (e.g., seed, soil-0, root-1, insight-0)',
      example: 'root-0',
      name: 'nodeId',
    }),
    ApiResponse({
      description: 'Dialogue started with initial AI question',
      schema: {
        example: {
          data: {
            dialogue: {
              createdAt: '2026-01-01T00:00:00Z',
              id: '507f1f77bcf86cd799439012',
              lastMessageAt: '2026-01-01T00:00:00Z',
              messageCount: 1,
              nodeId: 'root-0',
              nodeLabel: 'We need to hire more people',
              nodeType: 'root',
              sessionId: '507f1f77bcf86cd799439011',
            },
            initialQuestion: {
              content:
                'You\'ve identified "We need to hire more people" as an assumption. What evidence do you have that supports this belief? Have you considered what might happen if this assumption were incorrect?',
              dialogueId: '507f1f77bcf86cd799439012',
              id: '507f1f77bcf86cd799439013',
              metadata: {
                model: 'system',
              },
              role: 'assistant',
              sequence: 0,
              timestamp: '2026-01-01T00:00:00Z',
            },
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
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this canvas session',
      schema: {
        example: {
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this canvas session',
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
      description: 'Canvas session not found',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message:
              'Canvas session with ID 507f1f77bcf86cd799439011 not found',
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
