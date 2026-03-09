import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { CreateThoughtMapDto } from './dto/create-thought-map.dto';
import { CreateThoughtNodeDto } from './dto/create-thought-node.dto';
import { UpdateThoughtNodeDto } from './dto/update-thought-node.dto';

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
