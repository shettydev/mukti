import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { AddAssumptionDto } from './add-assumption.dto';
import { AddContextDto } from './add-context.dto';
import { CreateCanvasSessionDto } from './create-canvas-session.dto';
import { CreateInsightNodeDto } from './create-insight-node.dto';
import { CreateRelationshipDto } from './create-relationship.dto';
import { UpdateCanvasSessionDto } from './update-canvas-session.dto';
import { UpdateInsightNodeDto } from './update-insight-node.dto';

/**
 * Swagger documentation for creating a new canvas session
 */
export const ApiCreateCanvasSession = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Creates a new Thinking Canvas session with the problem structure (Seed, Soil, Roots)',
      summary: 'Create a new canvas session',
    }),
    ApiBearerAuth(),
    ApiBody({ type: CreateCanvasSessionDto }),
    ApiResponse({
      description: 'Canvas session successfully created',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            createdAt: '2026-01-01T00:00:00Z',
            problemStructure: {
              roots: [
                'We need to hire more people',
                'The workload is too high',
              ],
              seed: 'My team is burned out and productivity has dropped significantly',
              soil: ['Budget is tight', 'Deadline in 2 weeks', 'Remote team'],
            },
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
      description: 'Invalid input data',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: {
              roots: ['At least one assumption is required'],
              seed: ['Problem statement must be at least 10 characters'],
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
 * Swagger documentation for listing all canvas sessions for the authenticated user
 */
export const ApiGetCanvasSessions = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves all canvas sessions for the authenticated user, sorted by creation date (newest first)',
      summary: 'List all canvas sessions',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'Canvas sessions retrieved successfully',
      schema: {
        example: {
          data: [
            {
              _id: '507f1f77bcf86cd799439011',
              createdAt: '2026-01-01T00:00:00Z',
              problemStructure: {
                roots: [
                  'We need to hire more people',
                  'The workload is too high',
                ],
                seed: 'My team is burned out and productivity has dropped significantly',
                soil: ['Budget is tight', 'Deadline in 2 weeks', 'Remote team'],
              },
              updatedAt: '2026-01-01T00:00:00Z',
              userId: '507f1f77bcf86cd799439012',
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
  );

/**
 * Swagger documentation for getting a canvas session by ID
 */
export const ApiGetCanvasSessionById = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves a specific canvas session by ID with ownership validation',
      summary: 'Get canvas session by ID',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiResponse({
      description: 'Canvas session found',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            createdAt: '2026-01-01T00:00:00Z',
            problemStructure: {
              roots: [
                'We need to hire more people',
                'The workload is too high',
              ],
              seed: 'My team is burned out and productivity has dropped significantly',
              soil: ['Budget is tight', 'Deadline in 2 weeks', 'Remote team'],
            },
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
      status: 200,
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
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for updating a canvas session
 */
export const ApiUpdateCanvasSession = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Updates a canvas session with new node positions or explored nodes. Validates ownership before update.',
      summary: 'Update canvas session',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: UpdateCanvasSessionDto }),
    ApiResponse({
      description: 'Canvas session updated successfully',
      schema: {
        example: {
          data: {
            _id: '507f1f77bcf86cd799439011',
            createdAt: '2026-01-01T00:00:00Z',
            exploredNodes: ['seed', 'root-0'],
            nodePositions: [
              { nodeId: 'seed', x: 0, y: 0 },
              { nodeId: 'soil-0', x: -200, y: -100 },
            ],
            problemStructure: {
              roots: [
                'We need to hire more people',
                'The workload is too high',
              ],
              seed: 'My team is burned out and productivity has dropped significantly',
              soil: ['Budget is tight', 'Deadline in 2 weeks', 'Remote team'],
            },
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
      status: 200,
    }),
    ApiResponse({
      description: 'Invalid input data',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: {
              nodePositions: ['Each node position must have nodeId, x, and y'],
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
      status: 403,
    }),
    ApiResponse({
      description: 'Canvas session not found',
      status: 404,
    }),
  );

/**
 * Swagger documentation for adding an assumption
 */
export const ApiAddAssumption = () =>
  applyDecorators(
    ApiOperation({
      description: 'Adds a new assumption (Root node) to a canvas session',
      summary: 'Add assumption',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: AddAssumptionDto }),
    ApiResponse({
      description: 'Assumption added successfully',
      status: 200,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );

/**
 * Swagger documentation for adding context
 */
export const ApiAddContext = () =>
  applyDecorators(
    ApiOperation({
      description: 'Adds a new context item (Soil node) to a canvas session',
      summary: 'Add context',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: AddContextDto }),
    ApiResponse({
      description: 'Context added successfully',
      status: 200,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );

/**
 * Swagger documentation for creating an insight node
 */
export const ApiCreateInsight = () =>
  applyDecorators(
    ApiOperation({
      description: 'Creates a new insight node',
      summary: 'Create insight',
    }),
    ApiBearerAuth(),
    ApiParam({
      description: 'Canvas session ID',
      example: '507f1f77bcf86cd799439011',
      name: 'id',
    }),
    ApiBody({ type: CreateInsightNodeDto }),
    ApiResponse({
      description: 'Insight node created successfully',
      status: 201,
    }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );

/**
 * Swagger documentation for updating an insight node
 */
export const ApiUpdateInsight = () =>
  applyDecorators(
    ApiOperation({
      description: 'Updates an insight node',
      summary: 'Update insight',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiParam({ description: 'Node ID', name: 'nodeId' }),
    ApiBody({ type: UpdateInsightNodeDto }),
    ApiResponse({ description: 'Insight updated', status: 200 }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session or Node not found', status: 404 }),
  );

/**
 * Swagger documentation for creating a relationship
 */
export const ApiCreateRelationship = () =>
  applyDecorators(
    ApiOperation({
      description: 'Creates a relationship edge',
      summary: 'Create relationship',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiBody({ type: CreateRelationshipDto }),
    ApiResponse({ description: 'Relationship created', status: 201 }),
    ApiResponse({ description: 'Invalid input', status: 400 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );

/**
 * Swagger documentation for deleting an assumption
 */
export const ApiDeleteAssumption = () =>
  applyDecorators(
    ApiOperation({
      description: 'Deletes a dynamically-added assumption',
      summary: 'Delete assumption',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiParam({ description: 'Assumption index', name: 'index', type: Number }),
    ApiResponse({ description: 'Assumption deleted', status: 200 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );

/**
 * Swagger documentation for deleting a context item
 */
export const ApiDeleteContext = () =>
  applyDecorators(
    ApiOperation({
      description: 'Deletes a dynamically-added context item',
      summary: 'Delete context',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiParam({ description: 'Context index', name: 'index', type: Number }),
    ApiResponse({ description: 'Context deleted', status: 200 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );

/**
 * Swagger documentation for deleting an insight node
 */
export const ApiDeleteInsight = () =>
  applyDecorators(
    ApiOperation({
      description: 'Deletes an insight node',
      summary: 'Delete insight',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiParam({ description: 'Node ID', name: 'nodeId' }),
    ApiResponse({ description: 'Insight deleted', status: 200 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session or Node not found', status: 404 }),
  );

/**
 * Swagger documentation for deleting a relationship
 */
export const ApiDeleteRelationship = () =>
  applyDecorators(
    ApiOperation({
      description: 'Deletes a relationship edge',
      summary: 'Delete relationship',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiParam({ description: 'Relationship ID', name: 'relationshipId' }),
    ApiResponse({ description: 'Relationship deleted', status: 200 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({
      description: 'Session or Relationship not found',
      status: 404,
    }),
  );

/**
 * Swagger documentation for getting insights
 */
export const ApiGetInsights = () =>
  applyDecorators(
    ApiOperation({
      description: 'Gets all insight nodes for a session',
      summary: 'Get insights',
    }),
    ApiBearerAuth(),
    ApiParam({ description: 'Session ID', name: 'id' }),
    ApiResponse({ description: 'Insights retrieved', status: 200 }),
    ApiResponse({ description: 'Unauthorized', status: 401 }),
    ApiResponse({ description: 'Forbidden', status: 403 }),
    ApiResponse({ description: 'Session not found', status: 404 }),
  );
