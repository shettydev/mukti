import type { Request, Response } from 'express';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';

/**
 * Express `Request` augmented with the optional `user` property attached by
 * `JwtAuthGuard` after successful authentication.
 */
interface AuthenticatedRequest extends Request {
  user?: { _id?: unknown };
}

/**
 * Shape of the structured object returned by `HttpException.getResponse()` when the
 * response is not a plain string. Covers both NestJS built-in formats and the custom
 * error envelope used by guards/services in this project.
 */
interface ExceptionResponseBody {
  /** Either a plain NestJS error label (string) or a structured error object. */
  error?: string | { code?: string; details?: unknown; message?: string };
  /** Validation messages (array) or a single human-readable message (string). */
  message?: string | string[];
  /** HTTP status code echo — present in NestJS default responses. */
  statusCode?: number;
}

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
    const request = ctx.getRequest<AuthenticatedRequest>();

    // Generate unique request ID for tracking
    const requestId = uuidv7();

    // Determine status code and error details
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : this.resolveNonHttpExceptionStatus(exception);

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
    details?: unknown;
    message: string;
  } {
    if (isHttpException) {
      const httpException = exception as HttpException;
      const exceptionResponse = httpException.getResponse();

      // Handle structured error responses
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as ExceptionResponseBody;

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
          (responseObj.error.code ?? responseObj.error.message)
        ) {
          return {
            code: responseObj.error.code ?? this.getErrorCode(httpException),
            details: responseObj.error.details,
            message: responseObj.error.message ?? httpException.message,
          };
        }

        // Handle standard NestJS error format
        return {
          code: this.getErrorCode(httpException),
          // When `error` is a plain string label (e.g. "Bad Request") pass it
          // through as details; when it is an object we already handled it above.
          details:
            typeof responseObj.error === 'string'
              ? responseObj.error
              : undefined,
          message:
            typeof responseObj.message === 'string'
              ? (responseObj.message ?? httpException.message)
              : httpException.message,
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

    // Handle errors with status codes (e.g., http-errors like csurf ForbiddenError)
    const error = exception as Error & { code?: string; status?: number };
    const isKnownHttpError =
      typeof error.status === 'number' &&
      error.status >= 400 &&
      error.status < 600;

    return {
      code:
        error.code === 'EBADCSRFTOKEN'
          ? 'INVALID_CSRF_TOKEN'
          : isKnownHttpError
            ? 'FORBIDDEN'
            : 'INTERNAL_SERVER_ERROR',
      details:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              stack: error.stack,
            },
      message:
        process.env.NODE_ENV === 'production' && !isKnownHttpError
          ? 'An unexpected error occurred'
          : (error.message ?? 'Internal server error'),
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
    request: AuthenticatedRequest,
    requestId: string,
    status: number,
  ): void {
    const error = exception as Error;
    const message = error.message ?? 'Unknown error';

    // Build context object for logging
    const context = {
      ip: request.ip,
      method: request.method,
      requestId,
      status,
      url: request.url,
      userAgent: request.get('user-agent'),
      userId:
        request.user?._id !== null && request.user?._id !== undefined
          ? (request.user._id as { toString(): string }).toString()
          : undefined,
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

  /**
   * Resolves the HTTP status code from a non-HttpException error.
   * Supports errors created by `http-errors` (used by Express middleware like csurf)
   * which carry a `status` property.
   */
  private resolveNonHttpExceptionStatus(exception: unknown): number {
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception
    ) {
      const status = (exception as { status: unknown }).status;
      if (typeof status === 'number' && status >= 400 && status < 600) {
        return status;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
