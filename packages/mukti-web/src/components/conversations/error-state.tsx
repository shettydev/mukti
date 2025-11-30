'use client';

/**
 * ErrorState component for displaying typed error messages
 *
 * Displays user-friendly error messages with appropriate icons
 * and optional retry/back buttons based on error type.
 *
 * Requirements: 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { AlertCircle, ArrowLeft, FileQuestion, Lock, RefreshCw, WifiOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api/client';
import {
  ApiErrorCode,
  getErrorCodeFromStatus,
  getErrorMessage,
  isForbiddenError,
  isNotFoundError,
  isRateLimitError,
  isRetryableError,
} from '@/lib/utils/error-types';

export interface ErrorStateProps {
  /** Additional CSS classes */
  className?: string;
  /** Custom message to override the default error message */
  customMessage?: string;
  /** The error to display */
  error: unknown;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Whether to show the back button */
  showBack?: boolean;
  /** Whether to show the retry button */
  showRetry?: boolean;
  /** Custom title for the error state */
  title?: string;
}

/**
 * ErrorState component displays error information with appropriate actions
 */
export function ErrorState({
  className = '',
  customMessage,
  error,
  onBack,
  onRetry,
  showBack,
  showRetry,
  title,
}: ErrorStateProps) {
  const Icon = getErrorIcon(error);
  const errorTitle = title ?? getErrorTitle(error);
  const errorMessage = customMessage ?? getErrorMessage(error);

  // Determine which buttons to show
  const shouldShowRetry = showRetry ?? (isRetryableError(error) && !!onRetry);
  const shouldShowBack = showBack ?? (isNotFoundError(error) || isForbiddenError(error));

  // Don't show error state for rate limit errors - use RateLimitBanner instead
  if (isRateLimitError(error)) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
      data-testid="error-state"
      role="alert"
    >
      <div
        className="mb-4 rounded-full bg-destructive/10 p-3"
        data-testid="error-icon"
      >
        <Icon aria-hidden="true" className="h-8 w-8 text-destructive" />
      </div>

      <h3
        className="mb-2 text-lg font-semibold"
        data-testid="error-title"
      >
        {errorTitle}
      </h3>

      <p
        className="mb-6 max-w-md text-muted-foreground"
        data-testid="error-message"
      >
        {errorMessage}
      </p>

      <div className="flex gap-3">
        {shouldShowRetry && onRetry && (
          <Button
            aria-label="Try again"
            data-testid="retry-button"
            onClick={onRetry}
            variant="default"
          >
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}

        {shouldShowBack && onBack && (
          <Button
            aria-label="Go back"
            data-testid="back-button"
            onClick={onBack}
            variant="outline"
          >
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Gets the appropriate icon for the error type
 */
function getErrorIcon(error: unknown) {
  if (error instanceof ApiClientError) {
    const errorCode = getErrorCodeFromStatus(error.status);

    switch (errorCode) {
      case ApiErrorCode.FORBIDDEN:
      case ApiErrorCode.UNAUTHORIZED:
        return Lock;
      case ApiErrorCode.NETWORK_ERROR:
        return WifiOff;
      case ApiErrorCode.NOT_FOUND:
        return FileQuestion;
      default:
        return AlertCircle;
    }
  }

  return AlertCircle;
}

/**
 * Gets the appropriate title for the error type
 */
function getErrorTitle(error: unknown): string {
  if (error instanceof ApiClientError) {
    const errorCode = getErrorCodeFromStatus(error.status);

    switch (errorCode) {
      case ApiErrorCode.FORBIDDEN:
        return 'Access Denied';
      case ApiErrorCode.NETWORK_ERROR:
        return 'Connection Error';
      case ApiErrorCode.NOT_FOUND:
        return 'Not Found';
      case ApiErrorCode.RATE_LIMIT_EXCEEDED:
        return 'Rate Limit Exceeded';
      case ApiErrorCode.SERVER_ERROR:
        return 'Server Error';
      case ApiErrorCode.UNAUTHORIZED:
        return 'Authentication Required';
      default:
        return 'Error';
    }
  }

  return 'Error';
}
