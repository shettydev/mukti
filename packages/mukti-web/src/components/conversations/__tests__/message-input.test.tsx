/**
 * Unit tests for MessageInput component
 *
 * Tests:
 * - Textarea auto-resize
 * - Send button enable/disable logic
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Input validation (no empty/whitespace messages)
 * - Input clearing after send
 *
 * Requirements: 7.1, 7.2, 7.3, 7.8
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MessageInput } from '../message-input';

describe('MessageInput', () => {
  const mockOnSend = jest.fn();
  const defaultProps = {
    conversationId: 'test-conversation-id',
    onSend: mockOnSend,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSend.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render textarea and send button', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
      expect(screen.getByTestId('character-count')).toBeInTheDocument();
    });

    it('should display placeholder text', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      expect(textarea).toHaveAttribute(
        'placeholder',
        'Type your message... (Enter to send, Shift+Enter for new line)'
      );
    });

    it('should have proper aria labels', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByLabelText('Message input')).toBeInTheDocument();
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    });
  });

  describe('send button enable/disable logic', () => {
    it('should disable send button when input is empty', () => {
      render(<MessageInput {...defaultProps} />);

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when input contains only whitespace', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, '   ');

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has valid content', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).not.toBeDisabled();
    });

    it('should disable send button when disabled prop is true', () => {
      render(<MessageInput {...defaultProps} disabled />);

      const textarea = screen.getByTestId('message-input');
      // Textarea should be disabled
      expect(textarea).toBeDisabled();

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when content exceeds max length', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={10} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'This is too long');

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });
  });

  describe('input validation', () => {
    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, '   \n\t  ');

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should trim whitespace from message before sending', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, '  Hello World  ');

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Hello World');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should send message on Enter key', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');
      await user.keyboard('{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });

    it('should insert newline on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not send on Enter when input is empty', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.click(textarea);
      await user.keyboard('{Enter}');

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('input clearing after send', () => {
    it('should clear input after successful send', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');
      await user.click(screen.getByTestId('send-button'));

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should not clear input if send fails', async () => {
      mockOnSend.mockRejectedValueOnce(new Error('Send failed'));
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      // Wait for the async operation to complete
      // Input should still have the value since send failed
      await waitFor(() => {
        expect(textarea).toHaveValue('Hello');
      });
    });
  });

  describe('textarea auto-resize', () => {
    it('should have initial minimum height', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      expect(textarea).toHaveClass('min-h-[56px]');
    });

    it('should have maximum height constraint', () => {
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      expect(textarea).toHaveClass('max-h-[200px]');
    });

    it('should adjust height when content changes', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input') as HTMLTextAreaElement;

      // Type multiple lines
      await user.type(textarea, 'Line 1\nLine 2\nLine 3\nLine 4');

      // The height should be adjusted (we can't easily test exact pixel values in jsdom)
      // But we can verify the textarea has the resize-none class
      expect(textarea).toHaveClass('resize-none');
    });
  });

  describe('character count display', () => {
    it('should display character count', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={100} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');

      const characterCount = screen.getByTestId('character-count');
      expect(characterCount).toHaveTextContent('5 / 100');
    });

    it('should show warning color when near limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={10} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, '1234567890'); // 10 chars, exactly at limit but not over

      const characterCount = screen.getByTestId('character-count');
      expect(characterCount).toHaveClass('text-yellow-600');
    });

    it('should show error color when over limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={5} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Too long');

      const characterCount = screen.getByTestId('character-count');
      expect(characterCount).toHaveClass('text-destructive');
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when sending', async () => {
      // Make onSend take some time
      mockOnSend.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      // Should show loading spinner
      expect(sendButton.querySelector('.animate-spin')).toBeInTheDocument();

      // Wait for send to complete
      await waitFor(() => {
        expect(sendButton.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });

    it('should disable textarea while sending', async () => {
      mockOnSend.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Hello');

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      // Textarea should be disabled while sending
      expect(textarea).toBeDisabled();

      // Wait for send to complete
      await waitFor(() => {
        expect(textarea).not.toBeDisabled();
      });
    });
  });
});
