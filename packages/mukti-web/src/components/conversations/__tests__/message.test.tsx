/**
 * Unit tests for Message component
 */

import { act, render, screen } from '@testing-library/react';

import type { Message as MessageType } from '@/types/conversation.types';

import { Message } from '../message';

describe('Message', () => {
  const mockUserMessage: MessageType = {
    content: 'This is a user message',
    role: 'user',
    sequence: 1,
    timestamp: '2024-01-01T12:00:00Z',
    tokens: 10,
  };

  const mockAssistantMessage: MessageType = {
    content: 'This is an assistant message',
    role: 'assistant',
    sequence: 2,
    timestamp: '2024-01-01T12:01:00Z',
    tokens: 15,
  };

  it('should render user message with correct styling', () => {
    const { container } = render(<Message message={mockUserMessage} />);

    const messageContent = screen.getByText('This is a user message');
    expect(messageContent).toBeInTheDocument();

    // Check for user-specific styling (primary background)
    const styledContainer = container.querySelector('.bg-primary');
    expect(styledContainer).toBeInTheDocument();
    expect(styledContainer).toHaveClass('text-primary-foreground');
  });

  it('should render assistant message with correct styling', () => {
    const { container } = render(<Message message={mockAssistantMessage} />);

    const messageContent = screen.getByText('This is an assistant message');
    expect(messageContent).toBeInTheDocument();

    // Check for assistant-specific styling (muted background)
    const styledContainer = container.querySelector('.bg-muted');
    expect(styledContainer).toBeInTheDocument();
    expect(styledContainer).toHaveClass('text-foreground');
  });

  it('should display timestamp', () => {
    render(<Message message={mockUserMessage} />);

    // The timestamp is rendered in a <time> element with datetime attribute
    const timeElement = screen.getByRole('time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement).toHaveAttribute('datetime', '2024-01-01T12:00:00Z');
  });

  it('should display token count when provided', () => {
    render(<Message message={mockUserMessage} />);

    const tokenCount = screen.getByText(/10 tokens/);
    expect(tokenCount).toBeInTheDocument();
  });

  it('should not display token count when not provided', () => {
    const messageWithoutTokens: MessageType = {
      ...mockUserMessage,
      tokens: undefined,
    };

    render(<Message message={messageWithoutTokens} />);

    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
  });

  it('should preserve whitespace and line breaks in content', () => {
    const messageWithLineBreaks: MessageType = {
      ...mockUserMessage,
      content: 'Line 1\nLine 2\nLine 3',
    };

    render(<Message message={messageWithLineBreaks} />);

    const messageContent = screen.getByText(/Line 1/);
    expect(messageContent).toHaveClass('whitespace-pre-wrap');
  });

  it('should handle long content with word wrapping', () => {
    const longMessage: MessageType = {
      ...mockUserMessage,
      content: 'This is a very long message that should wrap properly without breaking the layout',
    };

    render(<Message message={longMessage} />);

    const messageContent = screen.getByText(/very long message/);
    expect(messageContent).toHaveClass('break-words');
  });

  describe('Animations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should apply fade-in animation on mount', () => {
      const { container } = render(<Message message={mockUserMessage} />);

      const messageWrapper = container.querySelector('.animate-fade-in');
      expect(messageWrapper).toBeInTheDocument();
    });

    it('should apply highlight animation for new messages', () => {
      const { container } = render(<Message message={mockUserMessage} />);

      const messageContent = container.querySelector('.animate-highlight');
      expect(messageContent).toBeInTheDocument();
    });

    it('should remove highlight animation after 1 second', () => {
      const { container } = render(<Message message={mockUserMessage} />);

      // Initially has highlight
      let messageContent = container.querySelector('.animate-highlight');
      expect(messageContent).toBeInTheDocument();

      // Fast-forward 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Highlight should be removed
      messageContent = container.querySelector('.animate-highlight');
      expect(messageContent).not.toBeInTheDocument();
    });

    it('should re-apply highlight when message timestamp changes', () => {
      const { container, rerender } = render(<Message message={mockUserMessage} />);

      // Fast-forward to remove initial highlight
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Verify highlight is removed
      let messageContent = container.querySelector('.animate-highlight');
      expect(messageContent).not.toBeInTheDocument();

      // Update message with new timestamp
      const updatedMessage: MessageType = {
        ...mockUserMessage,
        timestamp: '2024-01-01T12:05:00Z',
      };

      rerender(<Message message={updatedMessage} />);

      // Highlight should be re-applied
      messageContent = container.querySelector('.animate-highlight');
      expect(messageContent).toBeInTheDocument();
    });

    it('should maintain fade-in animation throughout component lifecycle', () => {
      const { container } = render(<Message message={mockUserMessage} />);

      // Fade-in should be present initially
      let messageWrapper = container.querySelector('.animate-fade-in');
      expect(messageWrapper).toBeInTheDocument();

      // Fast-forward past highlight duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Fade-in should still be present (it's on the wrapper, not removed)
      messageWrapper = container.querySelector('.animate-fade-in');
      expect(messageWrapper).toBeInTheDocument();
    });
  });
});
