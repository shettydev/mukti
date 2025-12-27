/**
 * Property-based tests for MessageInput component input validation
 *
 * **Feature: quick-chat-interface, Input validation enables send button**
 *
 * For any non-empty text input in the message bar, the send button should be enabled.
 *
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';

import { MessageInput } from '../../message-input';

// Generate safe alphanumeric strings that won't be interpreted as special keys by userEvent
const safeStringArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '), {
    maxLength: 50,
    minLength: 1,
  })
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0);

describe('Feature: quick-chat-interface, Input validation enables send button', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Input validation enables send button
   *
   * For any non-empty text input (after trimming), the send button should be enabled.
   */
  it('should enable send button for any non-empty text input', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async (inputText) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');
        const sendButton = screen.getByTestId('send-button');

        // Initially, send button should be disabled (empty input)
        expect(sendButton).toBeDisabled();

        // Set the input value directly using fireEvent to avoid special character issues
        fireEvent.change(textarea, { target: { value: inputText } });

        // Send button should now be enabled
        expect(sendButton).toBeEnabled();
      }),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * (continued): Send button disabled for empty/whitespace-only input
   *
   * For any input that is empty or contains only whitespace, the send button
   * should remain disabled.
   */
  it('should keep send button disabled for empty or whitespace-only input', async () => {
    // Generate whitespace-only strings
    const whitespaceArb = fc
      .array(fc.constantFrom(' ', '  ', '   ', '\t', '\n'), { maxLength: 5, minLength: 0 })
      .map((chars) => chars.join(''));

    await fc.assert(
      fc.asyncProperty(whitespaceArb, async (whitespaceInput) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');
        const sendButton = screen.getByTestId('send-button');

        // Initially, send button should be disabled
        expect(sendButton).toBeDisabled();

        // Set whitespace-only input
        fireEvent.change(textarea, { target: { value: whitespaceInput } });

        // Send button should still be disabled
        expect(sendButton).toBeDisabled();
      }),
      { numRuns: 50 }
    );
  }, 30000);

  /**
   * (continued): Send button state toggles correctly
   *
   * For any valid input followed by clearing, the send button should
   * toggle between enabled and disabled states correctly.
   */
  it('should toggle send button state when input is added and cleared', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async (inputText) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');
        const sendButton = screen.getByTestId('send-button');

        // Initially disabled
        expect(sendButton).toBeDisabled();

        // Set input - should enable
        fireEvent.change(textarea, { target: { value: inputText } });
        expect(sendButton).toBeEnabled();

        // Clear input - should disable
        fireEvent.change(textarea, { target: { value: '' } });
        expect(sendButton).toBeDisabled();
      }),
      { numRuns: 50 }
    );
  }, 30000);

  /**
   * (continued): Send button disabled when component is disabled
   *
   * For any input, if the component is disabled, the send button should
   * remain disabled regardless of input content.
   */
  it('should keep send button disabled when component is disabled regardless of input', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async () => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" disabled onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');
        const sendButton = screen.getByTestId('send-button');

        // Textarea should be disabled
        expect(textarea).toBeDisabled();

        // Send button should be disabled regardless of any potential input
        expect(sendButton).toBeDisabled();
      }),
      { numRuns: 20 }
    );
  }, 15000);
});
