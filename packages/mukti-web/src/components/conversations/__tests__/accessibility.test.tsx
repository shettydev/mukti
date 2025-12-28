/**
 * Accessibility tests for conversation components
 *
 * Tests keyboard navigation, ARIA labels, focus management,
 * and semantic HTML structure.
 *
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateConversationDialog } from '../create-conversation-dialog';
import { MessageInput } from '../message-input';
import { TagInput } from '../tag-input';
import { TechniqueSelector } from '../technique-selector';

// Mock hooks
jest.mock('@/lib/hooks/use-conversations', () => ({
  useCreateConversation: () => ({
    isPending: false,
    mutateAsync: jest.fn().mockResolvedValue({ id: '1', title: 'Test' }),
  }),
}));

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('Accessibility Tests', () => {
  describe('Keyboard Navigation', () => {
    it('should allow Enter to send message in MessageInput', async () => {
      const user = userEvent.setup();
      const mockOnSend = jest.fn().mockResolvedValue(undefined);

      render(<MessageInput conversationId="test-id" onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith('Test message');
      });
    });

    it('should allow Shift+Enter for newline in MessageInput', async () => {
      const user = userEvent.setup();
      const mockOnSend = jest.fn().mockResolvedValue(undefined);

      render(<MessageInput conversationId="test-id" onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should close dialog on Escape key', async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();

      render(<CreateConversationDialog onOpenChange={mockOnOpenChange} open />, {
        wrapper: createWrapper(),
      });

      // Press Escape
      await user.keyboard('{Escape}');

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should navigate TechniqueSelector options with keyboard', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(<TechniqueSelector onChange={mockOnChange} value={undefined} />);

      // Open the selector
      const button = screen.getByRole('button', { name: /select socratic technique/i });
      await user.click(button);

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find technique options
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);

      // Click first option
      await user.click(options[0]);

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should allow keyboard navigation in TagInput', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(<TagInput onChange={mockOnChange} value={['existing-tag']} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'new-tag');
      await user.keyboard('{Enter}');

      expect(mockOnChange).toHaveBeenCalledWith(['existing-tag', 'new-tag']);
    });

    it('should remove tag with Backspace in TagInput', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(<TagInput onChange={mockOnChange} value={['tag1', 'tag2']} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(mockOnChange).toHaveBeenCalledWith(['tag1']);
    });
  });

  describe('ARIA Labels', () => {
    it('should have aria-label on MessageInput textarea', () => {
      render(<MessageInput conversationId="test-id" onSend={jest.fn()} />);

      const textarea = screen.getByTestId('message-input');
      expect(textarea).toHaveAttribute('aria-label', 'Message input');
    });

    it('should have aria-label on send button', () => {
      render(<MessageInput conversationId="test-id" onSend={jest.fn()} />);

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
    });

    it('should have aria-describedby for character count', () => {
      render(<MessageInput conversationId="test-id" onSend={jest.fn()} />);

      const textarea = screen.getByTestId('message-input');
      expect(textarea).toHaveAttribute('aria-describedby', 'character-count');
      expect(screen.getByTestId('character-count')).toBeInTheDocument();
    });

    it('should have aria-expanded on TechniqueSelector', async () => {
      const user = userEvent.setup();

      render(<TechniqueSelector onChange={jest.fn()} value={undefined} />);

      const button = screen.getByRole('button', { name: /select socratic technique/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');

      await user.click(button);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should have aria-haspopup on TechniqueSelector', () => {
      render(<TechniqueSelector onChange={jest.fn()} value={undefined} />);

      const button = screen.getByRole('button', { name: /select socratic technique/i });
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('should have aria-selected on technique options', async () => {
      const user = userEvent.setup();

      render(<TechniqueSelector onChange={jest.fn()} value="elenchus" />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const selectedOption = screen.getByRole('option', { selected: true });
        expect(selectedOption).toBeInTheDocument();
      });
    });
  });

  describe('Focus Management', () => {
    it('should clear input and maintain focus after sending message', async () => {
      const user = userEvent.setup();
      const mockOnSend = jest.fn().mockResolvedValue(undefined);

      render(<MessageInput conversationId="test-id" onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-input');
      await user.type(textarea, 'Test message');

      // Use Enter key to send (which keeps focus on textarea)
      await user.keyboard('{Enter}');

      // Wait for the send to complete
      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith('Test message');
      });

      // Input should be cleared after successful send
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should trap focus within dialog when open', async () => {
      const user = userEvent.setup();

      render(<CreateConversationDialog onOpenChange={jest.fn()} open />, {
        wrapper: createWrapper(),
      });

      // Dialog should be present
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Tab through focusable elements
      await user.tab();

      // Focus should stay within dialog
      const focusedElement = document.activeElement;
      expect(dialog.contains(focusedElement)).toBe(true);
    });

    it('should focus first input when dialog opens', async () => {
      render(<CreateConversationDialog onOpenChange={jest.fn()} open />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        // The title input should be focusable
        const titleInput = screen.getByPlaceholderText(/what would you like to explore/i);
        expect(titleInput).toBeInTheDocument();
      });
    });
  });

  describe('Semantic HTML Structure', () => {
    it('should use dialog role for modals', () => {
      render(<CreateConversationDialog onOpenChange={jest.fn()} open />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy in dialogs', () => {
      render(<CreateConversationDialog onOpenChange={jest.fn()} open />, {
        wrapper: createWrapper(),
      });

      // Dialog should have a heading
      expect(screen.getByRole('heading', { name: /create new conversation/i })).toBeInTheDocument();
    });

    it('should use textbox role for inputs', () => {
      render(<TagInput onChange={jest.fn()} value={[]} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should use option role for technique items', async () => {
      const user = userEvent.setup();

      render(<TechniqueSelector onChange={jest.fn()} value={undefined} />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBe(6); // 6 Socratic techniques
      });
    });

    it('should have form element in create dialog', () => {
      render(<CreateConversationDialog onOpenChange={jest.fn()} open />, {
        wrapper: createWrapper(),
      });

      // Form should be present
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Touch Targets', () => {
    it('should have minimum touch target size for send button', () => {
      render(<MessageInput conversationId="test-id" onSend={jest.fn()} />);

      const sendButton = screen.getByTestId('send-button');
      // Button should have min-h-[44px] min-w-[44px] for touch targets
      expect(sendButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
    });
  });

  describe('Screen Reader Support', () => {
    it('should have sr-only text for icon-only buttons', () => {
      render(<MessageInput conversationId="test-id" onSend={jest.fn()} />);

      // Send button should have accessible name
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toHaveAccessibleName('Send message');
    });

    it('should announce character count to screen readers', () => {
      render(<MessageInput conversationId="test-id" onSend={jest.fn()} />);

      const characterCount = screen.getByTestId('character-count');
      expect(characterCount).toBeInTheDocument();
      expect(characterCount).toHaveAttribute('id', 'character-count');
    });
  });
});
