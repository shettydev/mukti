/**
 * Property-based tests for streaming indicator
 *
 * **Feature: quick-chat-interface, Streaming shows indicator**
 *
 * For any AI response being streamed, a typing indicator or streaming animation
 * should be visible.
 *
 */

import { cleanup, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';

import { LoadingMessage } from '../../loading-message';

describe('Feature: quick-chat-interface, Streaming shows indicator', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Streaming shows indicator
   *
   * For any processing state with isProcessing=true, the LoadingMessage component
   * should display a visible typing indicator.
   */
  it('should display typing indicator for any processing status', () => {
    fc.assert(
      fc.property(
        // Generate any non-empty status string
        fc.string({ maxLength: 100, minLength: 1 }).filter((s) => s.trim().length > 0),
        // Generate any duration (0 to 60 seconds)
        fc.integer({ max: 60, min: 0 }),
        (status, duration) => {
          cleanup();

          render(<LoadingMessage duration={duration} status={status} />);

          // Verify the component has role="status" for accessibility
          const statusElement = screen.getByRole('status');
          expect(statusElement).toBeInTheDocument();

          // Verify aria-live is set for screen readers
          expect(statusElement).toHaveAttribute('aria-live', 'polite');

          // Verify aria-label describes the loading state
          expect(statusElement).toHaveAttribute('aria-label', 'AI is generating a response');

          // Verify typing indicator dots are present (3 dots)
          const dots = statusElement.querySelectorAll('.animate-pulse-dot');
          expect(dots).toHaveLength(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Status text is displayed
   *
   * For any processing state, the status text should be visible to the user.
   */
  it('should display status text for any processing state', () => {
    fc.assert(
      fc.property(
        // Generate realistic status strings using array of characters (no trailing/leading spaces)
        fc
          .array(
            fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
            { maxLength: 50, minLength: 5 }
          )
          .map((chars) => chars.join('')),
        // Generate duration in the 0-5 second range (shows original status)
        fc.integer({ max: 5, min: 0 }),
        (status, duration) => {
          cleanup();

          render(<LoadingMessage duration={duration} status={status} />);

          // Verify the status text is displayed using textContent for robustness
          const statusElement = screen.getByRole('status');
          expect(statusElement).toHaveTextContent(status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Progressive disclosure updates status
   *
   * For any duration > 5 seconds, the status should update to progressive messages.
   */
  it('should show progressive status for longer durations', () => {
    fc.assert(
      fc.property(
        // Generate any non-empty status string
        fc.string({ maxLength: 100, minLength: 1 }).filter((s) => s.trim().length > 0),
        // Generate duration in the 6-10 second range
        fc.integer({ max: 10, min: 6 }),
        (status, duration) => {
          cleanup();

          render(<LoadingMessage duration={duration} status={status} />);

          // Verify the progressive status is shown instead of original
          expect(screen.getByText('Still working on it...')).toBeInTheDocument();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * (continued): Extended duration shows longer message
   *
   * For any duration > 10 seconds, the status should show extended message.
   */
  it('should show extended message for very long durations', () => {
    fc.assert(
      fc.property(
        // Generate any non-empty status string
        fc.string({ maxLength: 100, minLength: 1 }).filter((s) => s.trim().length > 0),
        // Generate duration > 10 seconds
        fc.integer({ max: 60, min: 11 }),
        (status, duration) => {
          cleanup();

          render(<LoadingMessage duration={duration} status={status} />);

          // Verify the extended message is shown
          expect(
            screen.getByText('This is taking longer than usual. Your response will arrive shortly.')
          ).toBeInTheDocument();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * (continued): Typing indicator animation classes are present
   *
   * For any processing state, the typing indicator dots should have animation classes.
   */
  it('should have animation classes on typing indicator dots', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 50, minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ max: 30, min: 0 }),
        (status, duration) => {
          cleanup();

          render(<LoadingMessage duration={duration} status={status} />);

          const statusElement = screen.getByRole('status');
          const dots = statusElement.querySelectorAll('.animate-pulse-dot');

          // Verify each dot has the animation class
          dots.forEach((dot) => {
            expect(dot).toHaveClass('animate-pulse-dot');
            expect(dot).toHaveClass('rounded-full');
            expect(dot).toHaveClass('bg-current');
          });

          // Verify dots have staggered animation delays
          const delays = Array.from(dots).map((dot) => (dot as HTMLElement).style.animationDelay);
          expect(delays).toEqual(['0ms', '200ms', '400ms']);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * (continued): Indicator is hidden from screen readers
   *
   * The typing indicator dots should be aria-hidden to avoid noise for screen readers.
   */
  it('should hide typing indicator from screen readers', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 50, minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ max: 30, min: 0 }),
        (status, duration) => {
          cleanup();

          render(<LoadingMessage duration={duration} status={status} />);

          const statusElement = screen.getByRole('status');
          const dotsContainer = statusElement.querySelector('[aria-hidden="true"]');

          // Verify the dots container is aria-hidden
          expect(dotsContainer).toBeInTheDocument();
          expect(dotsContainer).toHaveAttribute('aria-hidden', 'true');
        }
      ),
      { numRuns: 50 }
    );
  });
});
