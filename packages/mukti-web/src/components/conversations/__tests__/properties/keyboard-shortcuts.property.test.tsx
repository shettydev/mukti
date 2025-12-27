/**
 * Property-based tests for keyboard shortcuts in MessageInput component
 *
 * **Feature: quick-chat-interface,Keyboard shortcuts work**
 *
 * For any text in the input bar, pressing Enter should send the message.
 *
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';

import { MessageInput } from '../../message-input';

// Generate safe alphanumeric strings that won't be interpreted as special keys
const safeStringArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '), {
    maxLength: 50,
    minLength: 1,
  })
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0);

describe('Feature: quick-chat-interface,Keyboard shortcuts work', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   *Enter key sends message
   *
   * For any valid (non-empty) text in the input bar, pressing Enter should
   * trigger the send callback with the trimmed message content.
   */
  it('should send message on Enter key for any valid input', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async (inputText) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');

        // Set the input value
        fireEvent.change(textarea, { target: { value: inputText } });

        // Press Enter key
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        // Wait for async send to complete
        await waitFor(() => {
          expect(mockOnSend).toHaveBeenCalledTimes(1);
        });

        // Verify the message was sent with trimmed content
        expect(mockOnSend).toHaveBeenCalledWith(inputText.trim());
      }),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * (continued): Shift+Enter inserts newline instead of sending
   *
   * For any text in the input bar, pressing Shift+Enter should NOT send
   * the message (allowing newline insertion).
   */
  it('should not send message on Shift+Enter for any input', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async (inputText) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');

        // Set the input value
        fireEvent.change(textarea, { target: { value: inputText } });

        // Press Shift+Enter key
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

        // Give time for any potential async operations
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify the message was NOT sent
        expect(mockOnSend).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * (continued): Enter does not send empty/whitespace messages
   *
   * For any whitespace-only input, pressing Enter should NOT send the message.
   */
  it('should not send message on Enter for empty or whitespace-only input', async () => {
    const whitespaceArb = fc
      .array(fc.constantFrom(' ', '  ', '\t', '\n'), { maxLength: 5, minLength: 0 })
      .map((chars) => chars.join(''));

    await fc.assert(
      fc.asyncProperty(whitespaceArb, async (whitespaceInput) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');

        // Set whitespace-only input
        fireEvent.change(textarea, { target: { value: whitespaceInput } });

        // Press Enter key
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        // Give time for any potential async operations
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify the message was NOT sent
        expect(mockOnSend).not.toHaveBeenCalled();
      }),
      { numRuns: 50 }
    );
  }, 30000);

  /**
   * (continued): Input is cleared after successful Enter send
   *
   * For any valid text, after pressing Enter and successfully sending,
   * the input should be cleared.
   */
  it('should clear input after successful Enter send', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async (inputText) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input') as HTMLTextAreaElement;

        // Set the input value
        fireEvent.change(textarea, { target: { value: inputText } });

        // Verify input has value
        expect(textarea.value).toBe(inputText);

        // Press Enter key
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        // Wait for async send to complete and input to clear
        await waitFor(() => {
          expect(textarea.value).toBe('');
        });
      }),
      { numRuns: 50 }
    );
  }, 30000);

  /**
   * (continued): Enter does not send when component is disabled
   *
   * For any input, if the component is disabled, pressing Enter should NOT
   * send the message.
   */
  it('should not send message on Enter when component is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(safeStringArb, async (inputText) => {
        cleanup();

        const mockOnSend = jest.fn().mockResolvedValue(undefined);

        render(<MessageInput conversationId="test-conversation" disabled onSend={mockOnSend} />);

        const textarea = screen.getByTestId('message-input');

        // Textarea should be disabled
        expect(textarea).toBeDisabled();

        // Try to set input value (won't work on disabled textarea, but test the behavior)
        fireEvent.change(textarea, { target: { value: inputText } });

        // Press Enter key
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

        // Give time for any potential async operations
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify the message was NOT sent
        expect(mockOnSend).not.toHaveBeenCalled();
      }),
      { numRuns: 20 }
    );
  }, 15000);
});
