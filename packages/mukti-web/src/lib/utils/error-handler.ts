/**
 * Centralized error handling utilities
 *
 * Provides consistent error handling across the application:
 * - Error message extraction
 * - User-friendly error messages
 * - Error logging
 * - Toast notifications
 */

import { toast } from 'sonner';

import { ApiClientError } from '@/lib/api/client';

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_ALREADY_LINKED: 'This account is already linked to another user',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact support.',
  CONFLICT: 'This resource already exists',
  EMAIL_EXISTS: 'An account with this email already exists',
  EMAIL_NOT_VERIFIED: 'Please verify your email address to continue',
  INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action",
  INVALID_CREDENTIALS: 'Invalid email or password',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_RESPONSE: 'Received an unexpected response from the server',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TOKEN_EXPIRED: 'Your session has expired. Please sign in again.',
  TOKEN_INVALID: 'Invalid authentication token. Please sign in again.',
  TOKEN_NOT_FOUND: 'Reset or verification token not found',
  TOO_MANY_LOGIN_ATTEMPTS: 'Too many login attempts. Please try again later.',
  TOO_MANY_REQUESTS: 'Too many requests. Please slow down and try again.',
  TOO_MANY_RESET_REQUESTS: 'Too many password reset requests. Please try again later.',
  USER_NOT_FOUND: 'User not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  WEAK_PASSWORD: 'Password does not meet security requirements',
};

/**
 * Get user-friendly error message from error object
 *
 * @param error - Error object (can be ApiClientError, Error, or unknown)
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await api.login(credentials);
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast.error(message);
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  // Handle ApiClientError
  if (error instanceof ApiClientError) {
    // For specific error messages from the API, use them directly
    // Only use generic mappings if the API message is generic or missing
    if (error.message && error.message !== 'An error occurred') {
      return error.message;
    }

    // Check if we have a custom message for this error code
    if (error.code && ERROR_MESSAGES[error.code]) {
      return ERROR_MESSAGES[error.code];
    }

    // Fallback
    return 'An unexpected error occurred';
  }

  // Handle standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred';
}

/**
 * Check if error is an authentication error
 *
 * @param error - Error object
 * @returns True if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return (
      error.status === 401 ||
      error.code === 'TOKEN_EXPIRED' ||
      error.code === 'TOKEN_INVALID' ||
      error.code === 'INVALID_CREDENTIALS'
    );
  }

  return false;
}

/**
 * Check if error is a network error
 *
 * @param error - Error object
 * @returns True if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.code === 'NETWORK_ERROR' || error.status === 0;
  }

  if (error instanceof Error) {
    return (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch')
    );
  }

  return false;
}

/**
 * Check if error is a rate limit error
 *
 * @param error - Error object
 * @returns True if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return (
      error.status === 429 ||
      error.code === 'TOO_MANY_REQUESTS' ||
      error.code === 'TOO_MANY_LOGIN_ATTEMPTS' ||
      error.code === 'TOO_MANY_RESET_REQUESTS'
    );
  }

  return false;
}

/**
 * Check if error is a validation error
 *
 * @param error - Error object
 * @returns True if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    return error.status === 400 || error.code === 'VALIDATION_ERROR';
  }

  return false;
}

/**
 * Show error toast notification
 *
 * @param error - Error object
 * @param customMessage - Optional custom message to override default
 *
 * @example
 * ```typescript
 * try {
 *   await api.login(credentials);
 * } catch (error) {
 *   showErrorToast(error);
 * }
 * ```
 */
export function showErrorToast(error: unknown, customMessage?: string): void {
  const message = customMessage || getErrorMessage(error);
  toast.error(message);

  // Log error to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  }
}

/**
 * Show info toast notification
 *
 * @param message - Info message
 *
 * @example
 * ```typescript
 * showInfoToast('Verification email sent');
 * ```
 */
export function showInfoToast(message: string): void {
  toast.info(message);
}

/**
 * Show success toast notification
 *
 * @param message - Success message
 *
 * @example
 * ```typescript
 * await api.login(credentials);
 * showSuccessToast('Welcome back!');
 * ```
 */
export function showSuccessToast(message: string): void {
  toast.success(message);
}

/**
 * Show warning toast notification
 *
 * @param message - Warning message
 *
 * @example
 * ```typescript
 * showWarningToast('Your session will expire soon');
 * ```
 */
export function showWarningToast(message: string): void {
  toast.warning(message);
}
