/**
 * Error types and error message mapping for conversation API errors
 *
 * Provides typed error codes and user-friendly error messages
 * for all API error scenarios.
 *
 */

import { ApiClientError } from '@/lib/api/client';

/**
 * Typed error codes for better error handling
 */
export enum ApiErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  FORBIDDEN = 'FORBIDDEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR = 'SERVER_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Error message mapping for user-friendly display
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input.',
  [ApiErrorCode.CONFLICT]: 'A conflict occurred. Please refresh and try again.',
  [ApiErrorCode.FORBIDDEN]: "You don't have permission to access this conversation.",
  [ApiErrorCode.NETWORK_ERROR]: 'Connection failed. Please check your internet.',
  [ApiErrorCode.NOT_FOUND]: 'Conversation not found.',
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ApiErrorCode.SERVER_ERROR]: 'Something went wrong. Please try again.',
  [ApiErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
  [ApiErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred.',
  [ApiErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
};

/**
 * Maps HTTP status codes to ApiErrorCode
 */
export function getErrorCodeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 0:
      return ApiErrorCode.NETWORK_ERROR;
    case 400:
      return ApiErrorCode.BAD_REQUEST;
    case 401:
      return ApiErrorCode.UNAUTHORIZED;
    case 403:
      return ApiErrorCode.FORBIDDEN;
    case 404:
      return ApiErrorCode.NOT_FOUND;
    case 409:
      return ApiErrorCode.CONFLICT;
    case 429:
      return ApiErrorCode.RATE_LIMIT_EXCEEDED;
    case 500:
    case 502:
    case 503:
    case 504:
      return ApiErrorCode.SERVER_ERROR;
    default:
      return ApiErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Gets user-friendly error message from an error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    // Check if we have a specific error code from the API
    const apiCode = error.code as ApiErrorCode;
    if (apiCode && ERROR_MESSAGES[apiCode]) {
      return ERROR_MESSAGES[apiCode];
    }

    // Fall back to status-based error code
    const statusCode = getErrorCodeFromStatus(error.status);
    return ERROR_MESSAGES[statusCode];
  }

  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return ERROR_MESSAGES[ApiErrorCode.NETWORK_ERROR];
    }
    return error.message;
  }

  return ERROR_MESSAGES[ApiErrorCode.UNKNOWN_ERROR];
}

/**
 * Gets retry-after time from a rate limit error (in seconds)
 */
export function getRetryAfter(error: unknown): number {
  if (error instanceof ApiClientError && error.status === 429) {
    const details = error.details as null | undefined | { retryAfter?: number };
    return details?.retryAfter ?? 60; // Default to 60 seconds
  }
  return 60;
}

/**
 * Checks if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 401 || error.code === 'UNAUTHORIZED';
  }
  return false;
}

/**
 * Checks if an error is a permission error
 */
export function isForbiddenError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 403 || error.code === 'FORBIDDEN';
  }
  return false;
}

/**
 * Checks if an error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 404 || error.code === 'NOT_FOUND';
  }
  return false;
}

/**
 * Checks if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED';
  }
  return false;
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    // Network errors and server errors are retryable
    return (
      error.status === 0 ||
      error.status >= 500 ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'SERVER_ERROR'
    );
  }
  return false;
}
