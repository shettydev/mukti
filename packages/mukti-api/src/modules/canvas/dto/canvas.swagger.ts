import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

import { CreateCanvasSessionDto } from './create-canvas-session.dto';

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
