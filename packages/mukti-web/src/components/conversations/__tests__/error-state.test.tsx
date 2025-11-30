/**
 * Unit tests for ErrorState component
 *
 * Tests:
 * - ErrorState with various error types
 * - Error message display
 * - Retry button functionality
 * - Back button functionality
 * - Icon display based on error type
 *
 * Requirements: 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiClientError } from '@/lib/api/client';

import { ErrorState } from '../error-state';

describe('ErrorState', () => {
  const mockOnRetry = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render error state with title and message', () => {
      const error = new ApiClientError('Test error', 'UNKNOWN_ERROR', 500);
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByTestId('error-title')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      const error = new ApiClientError('Test error', 'UNKNOWN_ERROR', 500);
      render(<ErrorState error={error} />);

      const errorState = screen.getByTestId('error-state');
      expect(errorState).toHaveAttribute('role', 'alert');
      expect(errorState).toHaveAttribute('aria-live', 'polite');
    });

    it('should apply custom className', () => {
      const error = new ApiClientError('Test error', 'UNKNOWN_ERROR', 500);
      render(<ErrorState className="custom-class" error={error} />);

      expect(screen.getByTestId('error-state')).toHaveClass('custom-class');
    });
  });

  describe('error types and messages', () => {
    it('should display network error message for status 0', () => {
      const error = new ApiClientError('Network error', 'NETWORK_ERROR', 0);
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Connection Error');
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Connection failed. Please check your internet.'
      );
    });

    it('should display not found message for 404 status', () => {
      const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Not Found');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Conversation not found.');
    });

    it('should display forbidden message for 403 status', () => {
      const error = new ApiClientError('Forbidden', 'FORBIDDEN', 403);
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Access Denied');
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        "You don't have permission to access this conversation."
      );
    });

    it('should display server error message for 500 status', () => {
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Server Error');
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Something went wrong. Please try again.'
      );
    });

    it('should display unauthorized message for 401 status', () => {
      const error = new ApiClientError('Unauthorized', 'UNAUTHORIZED', 401);
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Authentication Required');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Please log in to continue.');
    });

    it('should handle generic Error objects', () => {
      const error = new Error('Generic error message');
      render(<ErrorState error={error} />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Error');
      expect(screen.getByTestId('error-message')).toHaveTextContent('Generic error message');
    });

    it('should handle unknown error types', () => {
      render(<ErrorState error="string error" />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Error');
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'An unexpected error occurred.'
      );
    });
  });

  describe('custom title and message', () => {
    it('should display custom title when provided', () => {
      const error = new ApiClientError('Test error', 'UNKNOWN_ERROR', 500);
      render(<ErrorState error={error} title="Custom Title" />);

      expect(screen.getByTestId('error-title')).toHaveTextContent('Custom Title');
    });

    it('should display custom message when provided', () => {
      const error = new ApiClientError('Test error', 'UNKNOWN_ERROR', 500);
      render(<ErrorState customMessage="Custom error message" error={error} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent('Custom error message');
    });
  });

  describe('retry button', () => {
    it('should show retry button for retryable errors when onRetry is provided', () => {
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should show retry button for network errors', () => {
      const error = new ApiClientError('Network error', 'NETWORK_ERROR', 0);
      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should not show retry button for non-retryable errors by default', () => {
      const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
    });

    it('should show retry button when showRetry is true', () => {
      const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
      render(<ErrorState error={error} onRetry={mockOnRetry} showRetry />);

      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      await user.click(screen.getByTestId('retry-button'));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should have proper aria-label on retry button', () => {
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} onRetry={mockOnRetry} />);

      expect(screen.getByTestId('retry-button')).toHaveAttribute('aria-label', 'Try again');
    });
  });

  describe('back button', () => {
    it('should show back button for not found errors when onBack is provided', () => {
      const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
      render(<ErrorState error={error} onBack={mockOnBack} />);

      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('should show back button for forbidden errors when onBack is provided', () => {
      const error = new ApiClientError('Forbidden', 'FORBIDDEN', 403);
      render(<ErrorState error={error} onBack={mockOnBack} />);

      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('should not show back button for server errors by default', () => {
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} onBack={mockOnBack} />);

      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
    });

    it('should show back button when showBack is true', () => {
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} onBack={mockOnBack} showBack />);

      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
      render(<ErrorState error={error} onBack={mockOnBack} />);

      await user.click(screen.getByTestId('back-button'));

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should have proper aria-label on back button', () => {
      const error = new ApiClientError('Not found', 'NOT_FOUND', 404);
      render(<ErrorState error={error} onBack={mockOnBack} />);

      expect(screen.getByTestId('back-button')).toHaveAttribute('aria-label', 'Go back');
    });
  });

  describe('rate limit errors', () => {
    it('should not render for rate limit errors (use RateLimitBanner instead)', () => {
      const error = new ApiClientError('Rate limit', 'RATE_LIMIT_EXCEEDED', 429);
      render(<ErrorState error={error} />);

      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
    });
  });

  describe('both buttons', () => {
    it('should show both retry and back buttons when appropriate', () => {
      const error = new ApiClientError('Server error', 'SERVER_ERROR', 500);
      render(<ErrorState error={error} onBack={mockOnBack} onRetry={mockOnRetry} showBack />);

      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });
  });
});
