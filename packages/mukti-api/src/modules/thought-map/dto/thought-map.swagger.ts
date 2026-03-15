import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { ConvertCanvasDto } from './convert-canvas.dto';
import { CreateShareLinkDto } from './create-share-link.dto';
import { CreateThoughtMapDto } from './create-thought-map.dto';
import { CreateThoughtNodeDto } from './create-thought-node.dto';
import { ExtractConversationDto } from './extract-conversation.dto';
import { RequestBranchSuggestionsDto } from './request-branch-suggestions.dto';
import { UpdateThoughtMapSettingsDto } from './update-thought-map-settings.dto';
import { UpdateThoughtNodeDto } from './update-thought-node.dto';

/**
 * Swagger documentation for creating a new ThoughtMap.
 */
export const ApiCreateThoughtMap = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Creates a new Thought Map with a root topic node. The title becomes the label of the root node at depth 0.',
      summary: 'Create a new Thought Map',
    }),
    ApiBearerAuth(),
    ApiBody({ type: CreateThoughtMapDto }),
    ApiResponse({
      description: 'Thought Map successfully created',
      schema: {
        example: {
          data: {
            map: {
              _id: '507f1f77bcf86cd799439011',
              createdAt: '2026-01-01T00:00:00Z',
              rootNodeId: 'topic-0',
              settings: {
                autoSuggestEnabled: true,
                autoSuggestIdleSeconds: 10,
                maxSuggestionsPerNode: 4,
              },
              status: 'active',
              title: 'Why is our team losing motivation?',
              updatedAt: '2026-01-01T00:00:00Z',
              userId: '507f1f77bcf86cd799439012',
            },
            rootNode: {
              _id: '507f1f77bcf86cd799439013',
              depth: 0,
              fromSuggestion: false,
              isCollapsed: false,
              isExplored: false,
              label: 'Why is our team losing motivation?',
              mapId: '507f1f77bcf86cd799439011',
              messageCount: 0,
              nodeId: 'topic-0',
              position: { x: 0, y: 0 },
              type: 'topic',
            },
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 201,
    }),
    ApiResponse({
      description: 'Invalid input data',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: { title: ['Title must be at most 500 characters'] },
            message: 'Validation failed',
          },
          meta: { timestamp: '2026-01-01T00:00:00Z' },
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
 * Swagger documentation for listing all Thought Maps for the authenticated user.
 */
export const ApiListThoughtMaps = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves all Thought Maps owned by the authenticated user, sorted by creation date (newest first).',
      summary: 'List all Thought Maps',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'Thought Maps retrieved successfully',
      schema: {
        example: {
          data: [
            {
              _id: '507f1f77bcf86cd799439011',
              createdAt: '2026-01-01T00:00:00Z',
              rootNodeId: 'topic-0',
              status: 'active',
              title: 'Why is our team losing motivation?',
              updatedAt: '2026-01-01T00:00:00Z',
              userId: '507f1f77bcf86cd799439012',
            },
          ],
          meta: {
            requestId: 'req-1234567890-abc123',
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
  );

/**
 * Swagger documentation for getting a single Thought Map with all its nodes.
 */
export const ApiGetThoughtMap = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves a specific Thought Map by ID with all associated ThoughtNodes, validating ownership.',
      summary: 'Get Thought Map by ID',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Thought Map found',
      schema: {
        example: {
          data: {
            map: {
              _id: '507f1f77bcf86cd799439011',
              rootNodeId: 'topic-0',
              status: 'active',
              title: 'Why is our team losing motivation?',
            },
            nodes: [
              {
                _id: '507f1f77bcf86cd799439013',
                depth: 0,
                label: 'Why is our team losing motivation?',
                nodeId: 'topic-0',
                position: { x: 0, y: 0 },
                type: 'topic',
              },
            ],
          },
          meta: {
            requestId: 'req-1234567890-abc123',
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
      description: 'Forbidden - User does not own this Thought Map',
      status: 403,
    }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

/**
 * Swagger documentation for adding a node to a Thought Map.
 */
export const ApiAddThoughtNode = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Adds a new ThoughtNode as a child of an existing node. The nodeId is auto-generated as `{type}-{count}`.',
      summary: 'Add a node to a Thought Map',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: CreateThoughtNodeDto }),
    ApiResponse({
      description: 'Node added successfully',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439014',
            depth: 1,
            fromSuggestion: false,
            isCollapsed: false,
            isExplored: false,
            label: 'Is the onboarding process unclear?',
            mapId: '507f1f77bcf86cd799439011',
            messageCount: 0,
            nodeId: 'question-0',
            parentId: 'topic-0',
            position: { x: 0, y: 0 },
            type: 'question',
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 201,
    }),
    ApiResponse({
      description: 'Invalid input or parent node not found',
      status: 400,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Forbidden - User does not own this Thought Map',
      status: 403,
    }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

/**
 * Swagger documentation for updating a ThoughtNode.
 */
export const ApiUpdateThoughtNode = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Updates an existing ThoughtNode — label, position, or collapsed state.',
      summary: 'Update a ThoughtNode',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Thought Map ID', name: 'id' }),
    ApiParam({
      description: 'Node ID (e.g., "thought-0", "question-1")',
      name: 'nodeId',
    }),
    ApiBody({ type: UpdateThoughtNodeDto }),
    ApiResponse({
      description: 'Node updated successfully',
      status: 200,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map or Node not found', status: 404 }),
  );

/**
 * Swagger documentation for deleting a ThoughtNode.
 */
export const ApiDeleteThoughtNode = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Deletes a ThoughtNode. Use ?cascade=true to also delete all descendant nodes. ' +
        'Without cascade, returns 409 if the node has children.',
      summary: 'Delete a ThoughtNode',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Thought Map ID', name: 'id' }),
    ApiParam({ description: 'Node ID to delete', name: 'nodeId' }),
    ApiQuery({
      description: 'If true, recursively deletes all descendant nodes',
      name: 'cascade',
      required: false,
      type: Boolean,
    }),
    ApiResponse({
      description: 'Node deleted successfully',
      schema: {
        example: {
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Node has children and cascade=false',
      schema: {
        example: {
          error: {
            code: 'CONFLICT',
            message:
              'Node has children. Use ?cascade=true to delete them recursively.',
          },
          meta: { timestamp: '2026-01-01T00:00:00Z' },
          success: false,
        },
      },
      status: 409,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map or Node not found', status: 404 }),
  );

/**
 * Swagger documentation for requesting AI branch suggestions.
 */
export const ApiRequestBranchSuggestions = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Enqueues an AI branch suggestion job for the given node. ' +
        'Returns 202 Accepted with a jobId. Subscribe to the SSE stream to receive suggestions in real time.',
      summary: 'Request AI branch suggestions for a node',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: RequestBranchSuggestionsDto }),
    ApiResponse({
      description:
        'Suggestion job accepted — connect to SSE stream for results',
      schema: {
        example: {
          data: {
            jobId: 'bullmq-job-id-1234',
            position: 1,
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 202,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map or Node not found', status: 404 }),
  );

/**
 * Swagger documentation for streaming AI branch suggestions via SSE.
 */
export const ApiStreamBranchSuggestions = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Server-Sent Events (SSE) stream for branch suggestions. ' +
        'Events: processing → suggestion (×2–4) → complete | error. ' +
        'Pass the JWT access token as a query parameter `?token=<jwt>` since EventSource does not support headers.',
      summary: 'SSE stream for branch suggestions',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiQuery({
      description:
        'BullMQ suggestion job ID returned by POST /thought-maps/:id/suggest',
      example: '42',
      name: 'jobId',
      required: true,
    }),
    ApiQuery({
      description:
        'JWT access token (required because EventSource does not support headers)',
      name: 'token',
      required: true,
    }),
    ApiResponse({
      description: 'SSE stream — text/event-stream',
      schema: {
        example:
          'data: {"type":"processing","data":{"jobId":"abc","status":"started"}}\n\n' +
          'data: {"type":"suggestion","data":{"label":"What assumptions are you making?","parentId":"topic-0","suggestedType":"question"}}\n\n' +
          'data: {"type":"complete","data":{"jobId":"abc","suggestionCount":3}}\n\n',
      },
      status: 200,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

/**
 * Swagger documentation for enqueuing a conversation → Thought Map extraction job.
 */
export const ApiExtractConversation = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Enqueues an AI extraction job that builds a draft Thought Map from a conversation. ' +
        'Returns 202 Accepted with a jobId. Subscribe to the SSE stream to receive the draft map in real time.',
      summary: 'Extract a Thought Map from a conversation',
    }),
    ApiBearerAuth(),
    ApiBody({ type: ExtractConversationDto }),
    ApiResponse({
      description:
        'Extraction job accepted — connect to the SSE stream for the draft map preview',
      schema: {
        example: {
          data: {
            jobId: 'bullmq-job-id-5678',
            position: 1,
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 202,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({
      description: 'Conversation not found or access denied',
      status: 404,
    }),
  );

/**
 * Swagger documentation for streaming a conversation extraction job via SSE.
 */
export const ApiStreamExtraction = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Server-Sent Events (SSE) stream for a map extraction job. ' +
        'Events: processing → preview (full draft map + nodes JSON) → complete | error. ' +
        'Pass the JWT access token as `?token=<jwt>` and the job ID as `?jobId=<jobId>` since EventSource does not support headers.',
      summary: 'SSE stream for map extraction job',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'BullMQ job ID returned by the extract endpoint',
      example: 'bullmq-job-id-5678',
      name: 'jobId',
    }),
    ApiQuery({
      description:
        'JWT access token (required because EventSource does not support headers)',
      name: 'token',
      required: true,
    }),
    ApiResponse({
      description: 'SSE stream — text/event-stream',
      schema: {
        example:
          'data: {"type":"processing","data":{"jobId":"5678","status":"started"}}\n\n' +
          'data: {"type":"preview","data":{"map":{...},"nodes":[...]}}\n\n' +
          'data: {"type":"complete","data":{"jobId":"5678","mapId":"abc","nodeCount":12}}\n\n',
      },
      status: 200,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
  );

/**
 * Swagger documentation for confirming a draft Thought Map extracted from a conversation.
 */
export const ApiConfirmThoughtMap = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Transitions a draft Thought Map (status: "draft") to active (status: "active"). ' +
        'Only maps with status "draft" can be confirmed. Validates ownership.',
      summary: 'Confirm a draft Thought Map',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Thought Map confirmed and activated',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            status: 'active',
            title: 'What drives team motivation?',
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({ description: 'Map is not in draft status', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({
      description: 'Forbidden - User does not own this Thought Map',
      status: 403,
    }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

// ============================================================================
// Phase 5 Swagger decorators
// ============================================================================

/**
 * Swagger documentation for converting a CanvasSession into a Thought Map.
 */
export const ApiConvertFromCanvas = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Converts an existing Thinking Canvas session into a new Thought Map. ' +
        'Seed → root topic node (depth 0), roots[] + soil[] → thought nodes (depth 1). ' +
        'Sets sourceCanvasSessionId on the resulting ThoughtMap.',
      summary: 'Convert a Canvas Session to a Thought Map',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas Session ID to convert',
      example: '507f1f77bcf86cd799439011',
      name: 'sessionId',
    }),
    ApiBody({ required: false, type: ConvertCanvasDto }),
    ApiResponse({
      description: 'ThoughtMap and nodes created from the canvas session',
      schema: {
        example: {
          data: {
            map: {
              _id: '507f1f77bcf86cd799439011',
              rootNodeId: 'topic-0',
              sourceCanvasSessionId: '507f1f77bcf86cd799439099',
              status: 'active',
              title: 'Why is our team losing motivation?',
            },
            nodes: [
              {
                depth: 0,
                label: 'Why is our team losing motivation?',
                nodeId: 'topic-0',
                type: 'topic',
              },
              {
                depth: 1,
                label: 'Leadership is unclear',
                nodeId: 'thought-0',
                type: 'thought',
              },
            ],
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 201,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({
      description: 'Canvas session not owned by user',
      status: 403,
    }),
    ApiResponse({ description: 'Canvas session not found', status: 404 }),
  );

/**
 * Swagger documentation for updating Thought Map auto-suggest settings.
 */
export const ApiUpdateThoughtMapSettings = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Updates the auto-suggestion settings on a Thought Map. ' +
        'All fields are optional — only supplied fields are changed.',
      summary: 'Update Thought Map settings',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: UpdateThoughtMapSettingsDto }),
    ApiResponse({
      description: 'Settings updated successfully',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            settings: {
              autoSuggestEnabled: false,
              autoSuggestIdleSeconds: 15,
              maxSuggestionsPerNode: 3,
            },
            title: 'Why is our team losing motivation?',
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({ description: 'Invalid field values', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

/**
 * Swagger documentation for creating a share link for a Thought Map.
 */
export const ApiCreateShareLink = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Creates a public share link for a Thought Map. ' +
        'If an active share link already exists it is revoked and replaced.',
      summary: 'Create or replace a Thought Map share link',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ required: false, type: CreateShareLinkDto }),
    ApiResponse({
      description: 'Share link created',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439022',
            createdBy: '507f1f77bcf86cd799439012',
            isActive: true,
            thoughtMapId: '507f1f77bcf86cd799439011',
            token: 'aBcDeFgHiJkLmNoPqRsTuVwX',
            viewCount: 0,
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 201,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

/**
 * Swagger documentation for getting the active share link for a Thought Map.
 */
export const ApiGetShareLink = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Returns the active share link for a Thought Map, or null if none exists.',
      summary: 'Get active share link for a Thought Map',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Active share link (or null)',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439022',
            isActive: true,
            thoughtMapId: '507f1f77bcf86cd799439011',
            token: 'aBcDeFgHiJkLmNoPqRsTuVwX',
            viewCount: 5,
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Thought Map not found', status: 404 }),
  );

/**
 * Swagger documentation for revoking the active share link for a Thought Map.
 */
export const ApiDeleteShareLink = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Deactivates (revokes) the active share link for a Thought Map.',
      summary: 'Revoke Thought Map share link',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Thought Map ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Share link revoked',
      schema: {
        example: {
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'No active share link found', status: 404 }),
  );

/**
 * Swagger documentation for the public shared map endpoint (no auth required).
 */
export const ApiGetSharedMap = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Resolves a share token and returns the public Thought Map with all nodes. ' +
        'Does NOT require authentication.',
      summary: 'Get a publicly shared Thought Map by token',
    }),
    ApiParam({
      description: 'URL-safe share token',
      example: 'aBcDeFgHiJkLmNoPqRsTuVwX',
      name: 'token',
    }),
    ApiResponse({
      description: 'Shared Thought Map and nodes',
      schema: {
        example: {
          data: {
            map: {
              _id: '507f1f77bcf86cd799439011',
              title: 'Why is our team losing motivation?',
            },
            nodes: [
              {
                depth: 0,
                label: 'Why is our team losing motivation?',
                nodeId: 'topic-0',
                type: 'topic',
              },
            ],
          },
          meta: {
            requestId: 'req-1234567890-abc123',
            timestamp: '2026-01-01T00:00:00Z',
          },
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Token invalid, revoked, or expired',
      status: 404,
    }),
  );
