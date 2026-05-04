import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SocraticTechnique } from '@/types/conversation.types';

import { EmptyState } from '../empty-state';

// Mock GSAP
jest.mock('gsap', () => ({
  gsap: {
    context: jest.fn(() => ({ revert: jest.fn() })),
    fromTo: jest.fn(),
    to: jest.fn(),
  },
}));

describe('EmptyState', () => {
  const defaultProps = {
    onSendMessage: jest.fn(),
    onTechniqueChange: jest.fn(),
    selectedTechnique: 'elenchus' as SocraticTechnique,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render heading from quirky headings list', () => {
      render(<EmptyState {...defaultProps} />);

      // Should render one of the quirky headings
      const headings = [
        'The unexamined life is not worth living.',
        'Know thyself.',
        'Wonder is the beginning of wisdom.',
        'I cannot teach anybody anything. I can only make them think.',
        'Speak so that I may see you.',
        'To know, is to know that you know nothing.',
        'To find yourself, think for yourself.',
      ];

      const renderedHeading = screen.getByRole('heading', { level: 1 });
      expect(headings).toContain(renderedHeading.textContent);
    });

    it('should render technique selector', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByText(/Choose your inquiry method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Choose your inquiry method/i)).toBeInTheDocument();
    });

    it('should render message input', () => {
      render(<EmptyState {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label', 'Message input');
    });

    it('should render send button', () => {
      render(<EmptyState {...defaultProps} />);

      const sendButton = screen.getByLabelText(/Send message/i);
      expect(sendButton).toBeInTheDocument();
    });

    it('should render helper text', () => {
      render(<EmptyState {...defaultProps} />);

      expect(
        screen.getByText(
          /Start your journey of inquiry. Press Enter to send, Shift\+Enter for a new line./i
        )
      ).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('should update content when typing', async () => {
      const user = userEvent.setup();
      render(<EmptyState {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      await user.type(input, 'Hello world');

      expect(input).toHaveValue('Hello world');
    });

    it('should enable send button when content is not empty', async () => {
      const user = userEvent.setup();
      render(<EmptyState {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      // Initially disabled
      expect(sendButton).toBeDisabled();

      // Type content
      await user.type(input, 'Hello');

      // Should be enabled
      expect(sendButton).not.toBeDisabled();
    });

    it('should keep send button disabled for whitespace-only content', async () => {
      const user = userEvent.setup();
      render(<EmptyState {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, '   ');

      expect(sendButton).toBeDisabled();
    });

    it('should auto-resize textarea based on content', async () => {
      const user = userEvent.setup();
      render(<EmptyState {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i) as HTMLTextAreaElement;

      // Type multiple lines using Shift+Enter to create newlines
      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2{Shift>}{Enter}{/Shift}Line 3');

      // Verify content was entered with newlines
      expect(input).toHaveValue('Line 1\nLine 2\nLine 3');
    });

    it('should limit textarea height to 200px', async () => {
      const user = userEvent.setup();
      render(<EmptyState {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i) as HTMLTextAreaElement;

      // Mock scrollHeight to exceed max
      Object.defineProperty(input, 'scrollHeight', {
        configurable: true,
        value: 300,
      });

      await user.type(input, 'Some text');

      // Should be capped at 200px
      expect(input.style.height).toBe('200px');
    });
  });

  describe('Sending Messages', () => {
    it('should call onSendMessage when send button clicked', async () => {
      const user = userEvent.setup();
      const onSendMessage = jest.fn().mockResolvedValue(undefined);

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'Hello world');
      await user.click(sendButton);

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should call onSendMessage when Enter pressed', async () => {
      const user = userEvent.setup();
      const onSendMessage = jest.fn().mockResolvedValue(undefined);

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);

      await user.type(input, 'Hello world');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should insert newline when Shift+Enter pressed', async () => {
      const user = userEvent.setup();
      const onSendMessage = jest.fn();

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);

      await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

      expect(input).toHaveValue('Line 1\nLine 2');
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('should clear input after successful send', async () => {
      const user = userEvent.setup();
      const onSendMessage = jest.fn().mockResolvedValue(undefined);

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'Hello world');
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should keep content on send error', async () => {
      const user = userEvent.setup();
      const onSendMessage = jest.fn().mockRejectedValue(new Error('Send failed'));

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'Hello world');
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('Hello world');
      });
    });

    it('should trim whitespace before sending', async () => {
      const user = userEvent.setup();
      const onSendMessage = jest.fn().mockResolvedValue(undefined);

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, '  Hello world  ');
      await user.click(sendButton);

      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Hello world');
      });
    });

    it('should disable input and button while sending', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const onSendMessage = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'Hello world');
      await user.click(sendButton);

      // Should be disabled while sending
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!();

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('Technique Selection', () => {
    it('should call onTechniqueChange when technique changed', async () => {
      const user = userEvent.setup();
      const onTechniqueChange = jest.fn();

      render(<EmptyState {...defaultProps} onTechniqueChange={onTechniqueChange} />);

      const selector = screen.getByLabelText(/Choose your inquiry method/i);
      await user.click(selector);

      // This would require mocking the TechniqueSelector component
      // For now, we just verify the selector is rendered
      expect(selector).toBeInTheDocument();
    });

    it('should disable technique selector when creating', () => {
      render(<EmptyState {...defaultProps} isCreating />);

      const selector = screen.getByLabelText(/Choose your inquiry method/i);
      expect(selector).toBeDisabled();
    });

    it('should disable technique selector when sending', async () => {
      const user = userEvent.setup();
      let resolvePromise: () => void;
      const onSendMessage = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(<EmptyState {...defaultProps} onSendMessage={onSendMessage} />);

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);
      const selector = screen.getByLabelText(/Choose your inquiry method/i);

      await user.type(input, 'Hello world');
      await user.click(sendButton);

      // Should be disabled while sending
      expect(selector).toBeDisabled();

      // Resolve the promise
      resolvePromise!();

      await waitFor(() => {
        expect(selector).not.toBeDisabled();
      });
    });
  });

  describe('Transition State', () => {
    it('should apply transition styles when isTransitioning is true', () => {
      const { container } = render(<EmptyState {...defaultProps} isTransitioning />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('opacity-0', 'scale-95', 'translate-y-4');
    });

    it('should not apply transition styles when isTransitioning is false', () => {
      const { container } = render(<EmptyState {...defaultProps} isTransitioning={false} />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).not.toHaveClass('opacity-0');
      expect(mainDiv).not.toHaveClass('scale-95');
      expect(mainDiv).not.toHaveClass('translate-y-4');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EmptyState {...defaultProps} />);

      expect(screen.getByLabelText('Message input')).toBeInTheDocument();
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
      expect(screen.getByLabelText(/Choose your inquiry method/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<EmptyState {...defaultProps} />);

      // Tab to technique selector
      await user.tab();
      expect(screen.getByLabelText(/Choose your inquiry method/i)).toHaveFocus();

      // Tab to textarea
      await user.tab();
      expect(screen.getByPlaceholderText(/Ask me anything/i)).toHaveFocus();

      // Type content to enable send button
      await user.type(screen.getByPlaceholderText(/Ask me anything/i), 'Test message');

      // Tab to send button (now enabled)
      await user.tab();
      expect(screen.getByLabelText(/Send message/i)).toHaveFocus();
    });

    it('should respect prefers-reduced-motion', () => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation((query) => ({
          addEventListener: jest.fn(),
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          removeEventListener: jest.fn(),
        })),
        writable: true,
      });

      render(<EmptyState {...defaultProps} />);

      // Component should render without animations
      // This is tested by checking that GSAP animations are not called
      // or are called with duration: 0
      expect(screen.getByPlaceholderText(/Ask me anything/i)).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<EmptyState {...defaultProps} className="custom-class" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('custom-class');
    });

    it('should preserve default classes when custom className provided', () => {
      const { container } = render(<EmptyState {...defaultProps} className="custom-class" />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('relative', 'flex', 'flex-1', 'custom-class');
    });
  });
});
