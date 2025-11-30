/**
 * Unit tests for RateLimitBanner component
 *
 * Tests:
 * - RateLimitBanner countdown
 * - Error message display
 * - Dismiss button functionality
 * - Auto-dismiss on countdown completion
 *
 * Requirements: 7.7, 11.4
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RateLimitBanner } from '../rate-limit-banner';

describe('RateLimitBanner', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should render banner with title and message', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('rate-limit-banner')).toBeInTheDocument();
      expect(screen.getByTestId('rate-limit-title')).toHaveTextContent('Rate Limit Exceeded');
      expect(screen.getByTestId('rate-limit-message')).toBeInTheDocument();
    });

    it('should display default message', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('rate-limit-message')).toHaveTextContent(
        "You've reached your message limit."
      );
    });

    it('should display custom message when provided', () => {
      render(
        <RateLimitBanner
          message="Custom rate limit message"
          onDismiss={mockOnDismiss}
          retryAfter={60}
        />
      );

      expect(screen.getByTestId('rate-limit-message')).toHaveTextContent(
        'Custom rate limit message'
      );
    });

    it('should have proper accessibility attributes', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      const banner = screen.getByTestId('rate-limit-banner');
      expect(banner).toHaveAttribute('role', 'alert');
      expect(banner).toHaveAttribute('aria-live', 'polite');
    });

    it('should apply custom className', () => {
      render(
        <RateLimitBanner className="custom-class" onDismiss={mockOnDismiss} retryAfter={60} />
      );

      expect(screen.getByTestId('rate-limit-banner')).toHaveClass('custom-class');
    });

    it('should display icon', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('rate-limit-icon')).toBeInTheDocument();
    });
  });

  describe('countdown display', () => {
    it('should display countdown in seconds for values under 60', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={30} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('30 seconds');
    });

    it('should display countdown in minutes:seconds format for values over 60', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={90} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('1:30');
    });

    it('should display countdown in minutes for exact minute values', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={120} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('2 minutes');
    });

    it('should display singular "second" for 1 second', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={1} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('1 second');
    });

    it('should display singular "minute" for 1 minute', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('1 minute');
    });

    it('should have proper aria-label on countdown', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={30} />);

      expect(screen.getByTestId('rate-limit-countdown')).toHaveAttribute(
        'aria-label',
        'Try again in 30 seconds'
      );
    });
  });

  describe('countdown behavior', () => {
    it('should decrement countdown every second', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={5} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('5 seconds');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('4 seconds');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('3 seconds');
    });

    it('should call onDismiss when countdown reaches zero', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={2} />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Need to flush the setTimeout in handleDismiss
      act(() => {
        jest.runAllTimers();
      });

      // onDismiss is called at least once when countdown reaches zero
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should not render when retryAfter is 0', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={0} />);

      expect(screen.queryByTestId('rate-limit-banner')).not.toBeInTheDocument();
    });

    it('should not render when retryAfter is negative', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={-5} />);

      expect(screen.queryByTestId('rate-limit-banner')).not.toBeInTheDocument();
    });

    it('should handle decimal retryAfter values by flooring', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={5.7} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('5 seconds');
    });
  });

  describe('dismiss button', () => {
    it('should not show dismiss button by default', () => {
      render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.queryByTestId('dismiss-button')).not.toBeInTheDocument();
    });

    it('should show dismiss button when dismissible is true', () => {
      render(<RateLimitBanner dismissible onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      jest.useRealTimers(); // Use real timers for user interaction
      const user = userEvent.setup();

      render(<RateLimitBanner dismissible onDismiss={mockOnDismiss} retryAfter={60} />);

      await user.click(screen.getByTestId('dismiss-button'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should have proper aria-label on dismiss button', () => {
      render(<RateLimitBanner dismissible onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('dismiss-button')).toHaveAttribute(
        'aria-label',
        'Dismiss rate limit banner'
      );
    });
  });

  describe('retryAfter prop changes', () => {
    it('should reset countdown when retryAfter prop changes', () => {
      const { rerender } = render(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={30} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('30 seconds');

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('20 seconds');

      // Change retryAfter prop
      rerender(<RateLimitBanner onDismiss={mockOnDismiss} retryAfter={60} />);

      expect(screen.getByTestId('countdown-value')).toHaveTextContent('1 minute');
    });
  });
});
