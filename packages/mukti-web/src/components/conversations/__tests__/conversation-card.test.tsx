/**
 * Unit tests for ConversationCard component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { formatDistanceToNow } from 'date-fns';

import type { Conversation } from '@/types/conversation.types';

import { ConversationCard } from '../conversation-card';

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockConversation: Conversation = {
  createdAt: '2024-01-01T00:00:00Z',
  hasArchivedMessages: false,
  id: 'test-id-123',
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0.05,
    lastMessageAt: '2024-01-15T12:00:00Z',
    messageCount: 5,
    totalTokens: 1000,
  },
  recentMessages: [
    {
      content: 'This is a test message',
      role: 'user',
      sequence: 1,
      timestamp: '2024-01-15T12:00:00Z',
    },
  ],
  tags: ['react', 'performance'],
  technique: 'elenchus',
  title: 'Test Conversation',
  updatedAt: '2024-01-15T12:00:00Z',
  userId: 'user-123',
};

describe('ConversationCard', () => {
  it('should render conversation title', () => {
    render(<ConversationCard conversation={mockConversation} />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
  });

  it('should render technique badge', () => {
    render(<ConversationCard conversation={mockConversation} />, { wrapper: createWrapper() });

    expect(screen.getByText('Elenchus')).toBeInTheDocument();
  });

  it('should render tags', () => {
    render(<ConversationCard conversation={mockConversation} />, { wrapper: createWrapper() });

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
  });

  it('should render message count', () => {
    render(<ConversationCard conversation={mockConversation} />, { wrapper: createWrapper() });

    expect(screen.getByText('5 messages')).toBeInTheDocument();
  });

  it('should render last message preview', () => {
    render(<ConversationCard conversation={mockConversation} />, { wrapper: createWrapper() });

    expect(screen.getByText('This is a test message')).toBeInTheDocument();
  });

  it('should render relative timestamp', () => {
    render(<ConversationCard conversation={mockConversation} />, { wrapper: createWrapper() });

    const expectedTime = formatDistanceToNow(new Date(mockConversation.metadata.lastMessageAt!), {
      addSuffix: true,
    });
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });

  it('should show favorite icon when conversation is favorited', () => {
    const favoritedConversation = { ...mockConversation, isFavorite: true };
    const { container } = render(<ConversationCard conversation={favoritedConversation} />, {
      wrapper: createWrapper(),
    });

    // Check for heart icon (lucide-react Heart component)
    const heartIcon = container.querySelector('svg.lucide-heart');
    expect(heartIcon).toBeInTheDocument();
  });

  it('should not show favorite icon when conversation is not favorited', () => {
    const { container } = render(<ConversationCard conversation={mockConversation} />, {
      wrapper: createWrapper(),
    });

    const heartIcon = container.querySelector('svg.lucide-heart');
    expect(heartIcon).not.toBeInTheDocument();
  });

  it('should truncate long message previews', () => {
    const longMessage = 'a'.repeat(150);
    const conversationWithLongMessage = {
      ...mockConversation,
      recentMessages: [
        {
          content: longMessage,
          role: 'user' as const,
          sequence: 1,
          timestamp: '2024-01-15T12:00:00Z',
        },
      ],
    };

    render(<ConversationCard conversation={conversationWithLongMessage} />, {
      wrapper: createWrapper(),
    });

    // Should show truncated message with ellipsis
    const truncatedText = longMessage.slice(0, 100) + '...';
    expect(screen.getByText(truncatedText)).toBeInTheDocument();
  });

  it('should show "No messages yet" when conversation has no messages', () => {
    const emptyConversation = {
      ...mockConversation,
      metadata: {
        ...mockConversation.metadata,
        messageCount: 0,
      },
      recentMessages: [],
    };

    render(<ConversationCard conversation={emptyConversation} />, { wrapper: createWrapper() });

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('should render as a link to conversation detail page', () => {
    const { container } = render(<ConversationCard conversation={mockConversation} />, {
      wrapper: createWrapper(),
    });

    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/dashboard/conversations/test-id-123');
  });

  it('should render all technique types correctly', () => {
    const techniques: Array<{
      display: string;
      value:
        | 'analogical'
        | 'counterfactual'
        | 'definitional'
        | 'dialectic'
        | 'elenchus'
        | 'maieutics';
    }> = [
      { display: 'Elenchus', value: 'elenchus' },
      { display: 'Dialectic', value: 'dialectic' },
      { display: 'Maieutics', value: 'maieutics' },
      { display: 'Definitional', value: 'definitional' },
      { display: 'Analogical', value: 'analogical' },
      { display: 'Counterfactual', value: 'counterfactual' },
    ];

    techniques.forEach(({ display, value }) => {
      const conversation = { ...mockConversation, technique: value };
      const { unmount } = render(<ConversationCard conversation={conversation} />, {
        wrapper: createWrapper(),
      });

      expect(screen.getByText(display)).toBeInTheDocument();
      unmount();
    });
  });
});
