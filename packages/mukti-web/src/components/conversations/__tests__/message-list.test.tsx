/**
 * Unit tests for MessageList component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Message } from '@/types/conversation.types';

import * as useConversationsHook from '@/lib/hooks/use-conversations';

import { MessageList } from '../message-list';

// Mock the hooks
jest.mock('@/lib/hooks/use-conversations', () => ({
  useArchivedMessages: jest.fn(),
}));

describe('MessageList', () => {
  const mockRecentMessages: Message[] = [
    {
      content: 'Recent message 1',
      role: 'user',
      sequence: 3,
      timestamp: '2024-01-01T12:02:00Z',
    },
    {
      content: 'Recent message 2',
      role: 'assistant',
      sequence: 4,
      timestamp: '2024-01-01T12:03:00Z',
    },
  ];

  const mockArchivedMessages: Message[] = [
    {
      content: 'Archived message 1',
      role: 'user',
      sequence: 1,
      timestamp: '2024-01-01T12:00:00Z',
    },
    {
      content: 'Archived message 2',
      role: 'assistant',
      sequence: 2,
      timestamp: '2024-01-01T12:01:00Z',
    },
  ];

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    function Wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    return Wrapper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render recent messages in chronological order', () => {
    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList
        conversationId="test-id"
        hasArchivedMessages={false}
        recentMessages={mockRecentMessages}
      />,
      { wrapper: createWrapper() }
    );

    const messages = screen.getAllByText(/Recent message/);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toHaveTextContent('Recent message 1');
    expect(messages[1]).toHaveTextContent('Recent message 2');
  });

  it('should combine archived and recent messages in chronological order', () => {
    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: {
        pageParams: [undefined],
        pages: [mockArchivedMessages],
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList
        conversationId="test-id"
        hasArchivedMessages
        recentMessages={mockRecentMessages}
      />,
      { wrapper: createWrapper() }
    );

    // Should have all 4 messages
    const allMessages = screen.getAllByText(/message/);
    expect(allMessages.length).toBeGreaterThanOrEqual(4);

    // Check order: archived messages should come before recent
    expect(screen.getByText('Archived message 1')).toBeInTheDocument();
    expect(screen.getByText('Archived message 2')).toBeInTheDocument();
    expect(screen.getByText('Recent message 1')).toBeInTheDocument();
    expect(screen.getByText('Recent message 2')).toBeInTheDocument();
  });

  it('should show LoadOlderButton when hasArchivedMessages is true and hasNextPage', () => {
    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: {
        pageParams: [undefined],
        pages: [mockArchivedMessages],
      },
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList
        conversationId="test-id"
        hasArchivedMessages
        recentMessages={mockRecentMessages}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('button', { name: /load older messages/i })).toBeInTheDocument();
  });

  it('should call fetchNextPage when LoadOlderButton is clicked', async () => {
    const user = userEvent.setup();
    const fetchNextPage = jest.fn();

    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: {
        pageParams: [undefined],
        pages: [mockArchivedMessages],
      },
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList
        conversationId="test-id"
        hasArchivedMessages
        recentMessages={mockRecentMessages}
      />,
      { wrapper: createWrapper() }
    );

    const button = screen.getByRole('button', { name: /load older messages/i });
    await user.click(button);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('should show empty state when no messages', () => {
    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList conversationId="test-id" hasArchivedMessages={false} recentMessages={[]} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    expect(screen.getByText(/start the conversation/i)).toBeInTheDocument();
  });

  it('should not show LoadOlderButton when hasArchivedMessages is false', () => {
    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList
        conversationId="test-id"
        hasArchivedMessages={false}
        recentMessages={mockRecentMessages}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('button', { name: /load older messages/i })).not.toBeInTheDocument();
  });

  it('should handle multiple pages of archived messages', () => {
    const page1 = [mockArchivedMessages[0]];
    const page2 = [mockArchivedMessages[1]];

    (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
      data: {
        pageParams: [undefined, 1],
        pages: [page1, page2],
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    render(
      <MessageList
        conversationId="test-id"
        hasArchivedMessages
        recentMessages={mockRecentMessages}
      />,
      { wrapper: createWrapper() }
    );

    // Should flatten and display all messages
    expect(screen.getByText('Archived message 1')).toBeInTheDocument();
    expect(screen.getByText('Archived message 2')).toBeInTheDocument();
  });

  describe('LoadingMessage integration', () => {
    it('should show LoadingMessage when processing state is active', () => {
      (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      render(
        <MessageList
          conversationId="test-id"
          hasArchivedMessages={false}
          processingState={{
            isProcessing: true,
            status: 'AI is thinking...',
          }}
          recentMessages={mockRecentMessages}
        />,
        { wrapper: createWrapper() }
      );

      // LoadingMessage should be visible
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
    });

    it('should not show LoadingMessage when processing state is inactive', () => {
      (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      render(
        <MessageList
          conversationId="test-id"
          hasArchivedMessages={false}
          processingState={{
            isProcessing: false,
            status: '',
          }}
          recentMessages={mockRecentMessages}
        />,
        { wrapper: createWrapper() }
      );

      // LoadingMessage should not be visible
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should pass queue position to LoadingMessage', () => {
      (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      render(
        <MessageList
          conversationId="test-id"
          hasArchivedMessages={false}
          processingState={{
            isProcessing: true,
            status: 'Processing your message...',
          }}
          recentMessages={mockRecentMessages}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Processing your message...')).toBeInTheDocument();
    });

    it('should position LoadingMessage at the end of message list', () => {
      (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as any);

      const { container } = render(
        <MessageList
          conversationId="test-id"
          hasArchivedMessages={false}
          processingState={{
            isProcessing: true,
            status: 'AI is thinking...',
          }}
          recentMessages={mockRecentMessages}
        />,
        { wrapper: createWrapper() }
      );

      // Find the message container
      const messageContainer = container.querySelector('.space-y-1');
      expect(messageContainer).toBeInTheDocument();

      // LoadingMessage should be after all regular messages
      const loadingMessage = screen.getByRole('status');

      // Verify LoadingMessage comes after messages in DOM order
      const allElements = Array.from(messageContainer?.children || []);
      const loadingIndex = allElements.findIndex((el) => el.contains(loadingMessage));
      const lastMessageIndex = allElements.findIndex((el) =>
        el.textContent?.includes('Recent message 2')
      );

      expect(loadingIndex).toBeGreaterThan(lastMessageIndex);
    });

    it('should not show LoadingMessage when processingState is undefined', () => {
      (useConversationsHook.useArchivedMessages as jest.Mock).mockReturnValue({
        data: undefined,
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      } as unknown);

      render(
        <MessageList
          conversationId="test-id"
          hasArchivedMessages={false}
          recentMessages={mockRecentMessages}
        />,
        { wrapper: createWrapper() }
      );

      // LoadingMessage should not be visible
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
