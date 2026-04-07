import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { DialogueSendMessageDto } from '../../dialogue/dto/send-message.dto';

/**
 * Swagger docs for starting Thought Map node dialogue with an initial question.
 */
export const ApiStartThoughtMapNodeDialogue = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Starts a Socratic dialogue for a Thought Map node. If the dialogue does not exist, creates it and enqueues AI generation of the initial question (async path: returns jobId + position, subscribe to SSE for the question). If the dialogue already exists, returns the first message directly (sync path: returns initialQuestion). Technique is auto-selected based on node context (RFC §5.1.1).',
      summary: 'Start Thought Map node dialogue',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'mapId',
    }),
    ApiParam({
      description: 'Node identifier (e.g., topic-0, thought-1, question-0)',
      example: 'thought-0',
      name: 'nodeId',
    }),
    ApiResponse({
      description:
        'Async path — new dialogue created, AI generating initial question via queue. Subscribe to the SSE stream for the initial question.',
      schema: {
        example: {
          data: {
            dialogue: {
              createdAt: '2026-01-01T00:00:00Z',
              id: '507f1f77bcf86cd799439012',
              lastMessageAt: null,
              messageCount: 0,
              nodeId: 'thought-0',
              nodeLabel: 'The process is unclear',
              nodeType: 'thought',
              sessionId: '',
            },
            jobId: 'job-123',
            position: 1,
          },
          meta: { requestId: 'uuid', timestamp: '2026-01-01T00:00:00Z' },
          success: true,
        },
      },
      status: 202,
    }),
    ApiResponse({
      description:
        'Sync path — dialogue already exists, returns the first message directly.',
      schema: {
        example: {
          data: {
            dialogue: {
              createdAt: '2026-01-01T00:00:00Z',
              id: '507f1f77bcf86cd799439012',
              lastMessageAt: '2026-01-01T00:00:00Z',
              messageCount: 1,
              nodeId: 'thought-0',
              nodeLabel: 'The process is unclear',
              nodeType: 'thought',
              sessionId: '',
            },
            initialQuestion: {
              content:
                'You\'ve noted: "The process is unclear". What led you to this thought? Is this an observation, an assumption, or a conclusion?',
              dialogueId: '507f1f77bcf86cd799439012',
              id: '507f1f77bcf86cd799439013',
              metadata: { model: 'system' },
              role: 'assistant',
              sequence: 0,
              timestamp: '2026-01-01T00:00:00Z',
            },
          },
          meta: { requestId: 'uuid', timestamp: '2026-01-01T00:00:00Z' },
          success: true,
        },
      },
      status: 202,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({
      description: 'Forbidden — user does not own this map',
      status: 403,
    }),
    ApiResponse({ description: 'Map or node not found', status: 404 }),
  );

/**
 * Swagger docs for retrieving paginated Thought Map node dialogue messages.
 */
export const ApiGetThoughtMapNodeMessages = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Returns the paginated dialogue history for a Thought Map node. Returns empty result if no dialogue exists yet.',
      summary: 'Get Thought Map node dialogue messages',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'mapId',
    }),
    ApiParam({
      description: 'Node identifier',
      example: 'thought-0',
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
      description: 'Messages per page (max 100)',
      example: 20,
      name: 'limit',
      required: false,
      type: Number,
    }),
    ApiResponse({
      description: 'Messages retrieved successfully',
      schema: {
        example: {
          data: {
            dialogue: {
              createdAt: '2026-01-01T00:00:00Z',
              id: '507f1f77bcf86cd799439012',
              messageCount: 4,
              nodeId: 'thought-0',
              nodeLabel: 'The process is unclear',
              nodeType: 'thought',
              sessionId: '',
            },
            messages: [
              {
                content: 'What led you to this thought?',
                id: '...',
                role: 'assistant',
                sequence: 0,
              },
            ],
            pagination: {
              hasMore: false,
              limit: 20,
              page: 1,
              total: 4,
              totalPages: 1,
            },
          },
          meta: { requestId: 'uuid', timestamp: '2026-01-01T00:00:00Z' },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Map not found', status: 404 }),
  );

/**
 * Swagger docs for sending a message to a Thought Map node dialogue.
 */
export const ApiSendThoughtMapNodeMessage = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Sends a user message to a Thought Map node dialogue and enqueues AI processing. Returns 202 Accepted with job ID immediately. Subscribe to the SSE stream for real-time events.',
      summary: 'Send message to Thought Map node dialogue',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'mapId',
    }),
    ApiParam({
      description: 'Node identifier',
      example: 'thought-0',
      name: 'nodeId',
    }),
    ApiBody({ type: DialogueSendMessageDto }),
    ApiResponse({
      description: 'Message enqueued for processing',
      schema: {
        example: {
          data: { jobId: 'job-123456', position: 1 },
          meta: { requestId: 'uuid', timestamp: '2026-01-01T00:00:00Z' },
          success: true,
        },
      },
      status: 202,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Map or node not found', status: 404 }),
  );

/**
 * Swagger docs for Thought Map node dialogue SSE stream.
 */
export const ApiStreamThoughtMapNodeDialogue = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Establishes a Server-Sent Events connection for real-time Thought Map node dialogue events. Events: processing (started), progress (status updates), message (user/assistant), complete (job done), error (failure).',
      summary: 'Stream Thought Map node dialogue events (SSE)',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'mapId',
    }),
    ApiParam({
      description: 'Node identifier',
      example: 'thought-0',
      name: 'nodeId',
    }),
    ApiResponse({
      description: 'SSE stream established',
      schema: {
        example: {
          data: {
            content: 'What assumptions are embedded in this thought?',
            role: 'assistant',
            sequence: 1,
            timestamp: '2026-01-01T00:00:01Z',
            tokens: 30,
          },
          dialogueId: '507f1f77bcf86cd799439012',
          nodeId: 'thought-0',
          sessionId: 'map:507f1f77bcf86cd799439011',
          timestamp: '2026-01-01T00:00:01Z',
          type: 'message',
        },
      },
      status: 200,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Map not found', status: 404 }),
  );
