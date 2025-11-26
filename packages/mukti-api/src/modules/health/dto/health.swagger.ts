import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Swagger documentation for comprehensive health check
 */
export const ApiHealthCheck = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Performs a comprehensive health check of the application and its dependencies. Checks the status of the application and MongoDB database connection with a 3-second timeout.',
      summary: 'Comprehensive health check',
    }),
    ApiResponse({
      description: 'Application and all dependencies are healthy',
      schema: {
        example: {
          details: {
            database: {
              status: 'up',
            },
          },
          error: {},
          info: {
            database: {
              status: 'up',
            },
          },
          status: 'ok',
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Application or one or more dependencies are unhealthy',
      schema: {
        example: {
          details: {
            database: {
              message: 'Connection timeout after 3000ms',
              status: 'down',
            },
          },
          error: {
            database: {
              message: 'Connection timeout after 3000ms',
              status: 'down',
            },
          },
          info: {},
          status: 'error',
        },
      },
      status: 503,
    }),
  );

/**
 * Swagger documentation for liveness probe
 */
export const ApiLivenessProbe = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Simple liveness probe endpoint that returns 200 OK if the application is running. Useful for Kubernetes liveness probes to determine if the pod should be restarted. Does not check external dependencies.',
      summary: 'Liveness probe',
    }),
    ApiResponse({
      description: 'Application is alive and running',
      schema: {
        example: {
          status: 'ok',
        },
      },
      status: 200,
    }),
  );

/**
 * Swagger documentation for readiness probe
 */
export const ApiReadinessProbe = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Readiness probe endpoint that checks if the application is ready to accept traffic. Verifies database connectivity with a 3-second timeout. Useful for Kubernetes readiness probes to determine if the pod should receive traffic.',
      summary: 'Readiness probe',
    }),
    ApiResponse({
      description: 'Application is ready to accept traffic',
      schema: {
        example: {
          details: {
            database: {
              status: 'up',
            },
          },
          error: {},
          info: {
            database: {
              status: 'up',
            },
          },
          status: 'ok',
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Application is not ready to accept traffic',
      schema: {
        example: {
          details: {
            database: {
              message: 'Connection timeout after 3000ms',
              status: 'down',
            },
          },
          error: {
            database: {
              message: 'Connection timeout after 3000ms',
              status: 'down',
            },
          },
          info: {},
          status: 'error',
        },
      },
      status: 503,
    }),
  );
