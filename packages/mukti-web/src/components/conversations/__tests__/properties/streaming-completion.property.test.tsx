/**
 * Property-based tests for streaming completion
 *
 * **Feature: quick-chat-interface, Streaming completion enables input**
 *
 * For any completed AI response, the input bar should be re-enabled and the
 * streaming indicator should be hidden.
 *
 */

import { cleanup, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';

import { MessageInput } from '../../message-input';

// Mock the TechniqueIndicator to avoid unnecessary complexity
jest.mock('../../technique-indicator', () => ({
  TechniqueIndicator: () => null,
}));

describe('Feature: quick-chat-interface, Streaming completion enables input', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Streaming completion enables input
   *
   * For any conversation state where streaming has completed (disabled=false),
   * the input bar should be enabled and ready for user input.
   */
  it('should enable input when streaming is complete (disabled=false)', () => {
    fc.assert(
      fc.property(
        // Generate any valid conversation ID
        fc.uuid(),
        // Generate any max length between 100 and 10000
        fc.integer({ max: 10000, min: 100 }),
        (conversationId, maxLength) => {
          cleanup();

          const mockOnSend = jest.fn().mockResolvedValue(undefined);

          render(
            <MessageInput
              conversationId={conversationId}
              disabled={false}
              maxLength={maxLength}
              onSend={mockOnSend}
            />
          );

          // Verify the textarea is enabled
          const textarea = screen.getByTestId('message-input');
          expect(textarea).not.toBeDisabled();
          expect(textarea).toHaveAttribute('aria-label', 'Message input');

          // Verify the send button exists (will be disabled until text is entered)
          const sendButton = screen.getByTestId('send-button');
          expect(sendButton).toBeInTheDocument();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Input is disabled during streaming
   *
   * For any conversation state where streaming is in progress (disabled=true),
   * the input bar should be disabled.
   */
  it('should disable input when streaming is in progress (disabled=true)', () => {
    fc.assert(
      fc.property(
        // Generate any valid conversation ID
        fc.uuid(),
        // Generate any max length between 100 and 10000
        fc.integer({ max: 10000, min: 100 }),
        (conversationId, maxLength) => {
          cleanup();

          const mockOnSend = jest.fn().mockResolvedValue(undefined);

          render(
            <MessageInput
              conversationId={conversationId}
              disabled
              maxLength={maxLength}
              onSend={mockOnSend}
            />
          );

          // Verify the textarea is disabled
          const textarea = screen.getByTestId('message-input');
          expect(textarea).toBeDisabled();

          // Verify the send button is also disabled
          const sendButton = screen.getByTestId('send-button');
          expect(sendButton).toBeDisabled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): State transition from disabled to enabled
   *
   * For any conversation, transitioning from disabled=true to disabled=false
   * should re-enable the input.
   */
  it('should re-enable input when transitioning from disabled to enabled', () => {
    fc.assert(
      fc.property(
        // Generate any valid conversation ID
        fc.uuid(),
        (conversationId) => {
          cleanup();

          const mockOnSend = jest.fn().mockResolvedValue(undefined);

          // First render with disabled=true (streaming in progress)
          const { rerender } = render(
            <MessageInput conversationId={conversationId} disabled onSend={mockOnSend} />
          );

          // Verify initially disabled
          const textarea = screen.getByTestId('message-input');
          expect(textarea).toBeDisabled();

          // Re-render with disabled=false (streaming complete)
          rerender(
            <MessageInput conversationId={conversationId} disabled={false} onSend={mockOnSend} />
          );

          // Verify now enabled
          expect(textarea).not.toBeDisabled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * (continued): Input maintains accessibility when enabled
   *
   * For any enabled input state, accessibility attributes should be present.
   */
  it('should maintain accessibility attributes when input is enabled', () => {
    fc.assert(
      fc.property(
        // Generate any valid conversation ID
        fc.uuid(),
        (conversationId) => {
          cleanup();

          const mockOnSend = jest.fn().mockResolvedValue(undefined);

          render(
            <MessageInput conversationId={conversationId} disabled={false} onSend={mockOnSend} />
          );

          // Verify accessibility attributes
          const textarea = screen.getByTestId('message-input');
          expect(textarea).toHaveAttribute('aria-label', 'Message input');
          expect(textarea).toHaveAttribute('aria-describedby', 'character-count');

          // Verify send button has aria-label
          const sendButton = screen.getByTestId('send-button');
          expect(sendButton).toHaveAttribute('aria-label', 'Send message');
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * (continued): Character count is visible when input is enabled
   *
   * For any enabled input state, the character count should be visible.
   */
  it('should show character count when input is enabled', () => {
    fc.assert(
      fc.property(
        // Generate any valid conversation ID
        fc.uuid(),
        // Generate any max length between 100 and 10000
        fc.integer({ max: 10000, min: 100 }),
        (conversationId, maxLength) => {
          cleanup();

          const mockOnSend = jest.fn().mockResolvedValue(undefined);

          render(
            <MessageInput
              conversationId={conversationId}
              disabled={false}
              maxLength={maxLength}
              onSend={mockOnSend}
            />
          );

          // Verify character count is displayed
          const characterCount = screen.getByTestId('character-count');
          expect(characterCount).toBeInTheDocument();
          expect(characterCount).toHaveTextContent(`0 / ${maxLength.toLocaleString()}`);
        }
      ),
      { numRuns: 50 }
    );
  });
});
