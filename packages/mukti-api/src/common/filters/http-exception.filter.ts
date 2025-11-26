import type { Request, Response } from 'express';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global exception filter that catches all HTTP exceptions and formats them consistently.
 * Provides structured error responses with request IDs for tracking and debugging.
 *
 * @remarks
 * This filter ensures all errors follow a consistent format across the API:
 * - Adds unique request IDs for error tracking
 * - Logs errors with context for debugging
 * - Formats error responses according to API standards
 * - Handles both known HttpExceptions and unexpected errors
 *
 * @example
 * ```typescript
 * // In main.ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 * ```
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Catches and processes exceptions, formatting them into consistent error responses.
   *
   * @param exception - The exception that was thrown
   * @param host - The arguments host containing request/response context
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate unique request ID for tracking
    const requestId = uuidv4();

    // Determine status code and error details
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error details
    const errorResponse = this.getErrorResponse(exception, isHttpException);

    // Log error with context
    this.logError(exception, request, requestId, status);

    // Send formatted error response
    response.status(status).json({
      error: {
        code: errorResponse.code,
        details: errorResponse.details,
        message: errorResponse.message,
      },
      meta: {
        method: request.method,
        path: request.url,
        requestId,
        timestamp: new Date().toISOString(),
      },
      success: false,
    });
  }

  /**
   * Generates an error code from the exception name.
   *
   * @param exception - The HTTP exception
   * @returns Error code in UPPER_SNAKE_CASE format
   */
  private getErrorCode(exception: HttpException): string {
    const name = exception.name;

    // Convert exception name to error code format
    // e.g., "BadRequestException" -> "BAD_REQUEST"
    // Remove "Exception" suffix first
    const withoutException = name.replace(/Exception$/, '');

    // Insert underscores before capital letters and convert to uppercase
    return withoutException.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
  }

  /**
   * Extracts error details from the exception.
   *
   * @param exception - The exception to extract details from
   * @param isHttpException - Whether the exception is an HttpException
   * @returns Structured error details
   */
  private getErrorResponse(
    exception: unknown,
    isHttpException: boolean,
  ): {
    code: string;
    details?: any;
    message: string;
  } {
    if (isHttpException) {
      const httpException = exception as HttpException;
      const exceptionResponse = httpException.getResponse();

      // Handle structured error responses
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;

        // Handle validation errors from class-validator (check this first)
        if (Array.isArray(responseObj.message)) {
          return {
            code: 'VALIDATION_ERROR',
            details: {
              errors: responseObj.message,
            },
            message: 'Validation failed',
          };
        }

        // If response already has error structure (from guards/services)
        // Only treat as custom error if error is an object with code/message
        if (
          responseObj.error &&
          typeof responseObj.error === 'object' &&
          (responseObj.error.code || responseObj.error.message)
        ) {
          return {
            code: responseObj.error.code || this.getErrorCode(httpException),
            details: responseObj.error.details,
            message: responseObj.error.message || httpException.message,
          };
        }

        // Handle standard NestJS error format
        return {
          code: this.getErrorCode(httpException),
          details: responseObj.error,
          message: responseObj.message || httpException.message,
        };
      }

      // Handle string error responses
      return {
        code: this.getErrorCode(httpException),
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : httpException.message,
      };
    }

    // Handle unexpected errors
    const error = exception as Error;
    return {
      code: 'INTERNAL_SERVER_ERROR',
      details:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              stack: error.stack,
            },
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message || 'Internal server error',
    };
  }

  /**
   * Logs error details with context for debugging and monitoring.
   *
   * @param exception - The exception that was thrown
   * @param request - The HTTP request object
   * @param requestId - Unique request identifier
   * @param status - HTTP status code
   */
  private logError(
    exception: unknown,
    request: Request,
    requestId: string,
    status: number,
  ): void {
    const error = exception as Error;
    const message = error.message || 'Unknown error';

    // Build context object for logging
    const context = {
      ip: request.ip,
      method: request.method,
      requestId,
      status,
      url: request.url,
      userAgent: request.get('user-agent'),
      userId: (request as any).user?.id, // If user is authenticated
    };

    // Log based on severity
    if (status >= 500) {
      // Server errors - log with stack trace
      this.logger.error(`${message} | ${JSON.stringify(context)}`, error.stack);
    } else if (status >= 400) {
      // Client errors - log as warning
      this.logger.warn(`${message} | ${JSON.stringify(context)}`);
    } else {
      // Other errors - log as info
      this.logger.log(`${message} | ${JSON.stringify(context)}`);
    }
  }
}
