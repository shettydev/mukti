/**
 * Unit tests for ConversationList component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { PaginatedConversations } from '@/types/conversation.types';

import * as useConversationsHook from '@/lib/hooks/use-conversations';

import { ConversationList } from '../conversation-list';

// Mock the hooks
jest.mock('@/lib/hooks/use-conversations');

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

const mockConversations: PaginatedConversations = {
  data: [
    {
      createdAt: '2024-01-01T00:00:00Z',
      hasArchivedMessages: false,
      id: 'conv-1',
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
          content: 'Test message 1',
          role: 'user',
          sequence: 1,
          timestamp: '2024-01-15T12:00:00Z',
        },
      ],
      tags: ['react'],
      technique: 'elenchus',
      title: 'Conversation 1',
      updatedAt: '2024-01-15T12:00:00Z',
      userId: 'user-123',
    },
    {
      createdAt: '2024-01-02T00:00:00Z',
      hasArchivedMessages: false,
      id: 'conv-2',
      isArchived: false,
      isFavorite: true,
      metadata: {
        estimatedCost: 0.03,
        lastMessageAt: '2024-01-14T10:00:00Z',
        messageCount: 3,
        totalTokens: 600,
      },
      recentMessages: [
        {
          content: 'Test message 2',
          role: 'user',
          sequence: 1,
          timestamp: '2024-01-14T10:00:00Z',
        },
      ],
      tags: ['typescript'],
      technique: 'dialectic',
      title: 'Conversation 2',
      updatedAt: '2024-01-14T10:00:00Z',
      userId: 'user-123',
    },
  ],
  meta: {
    limit: 20,
    page: 1,
    total: 2,
    totalPages: 1,
  },
};

describe('ConversationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading skeleton when loading', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: undefined,
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: true,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render error state when error occurs', () => {
    const mockError = new Error('Failed to load conversations');
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: undefined,
      error: mockError,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getAllByText('Failed to load conversations').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: /retry loading conversations/i })
    ).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockRefetch = jest.fn();
    const mockError = new Error('Failed to load conversations');

    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: undefined,
      error: mockError,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: mockRefetch,
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    const retryButton = screen.getByRole('button', { name: /retry loading conversations/i });
    await user.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should render empty state when no conversations', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [
          {
            data: [],
            meta: {
              limit: 20,
              page: 1,
              total: 0,
              totalPages: 0,
            },
          },
        ],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /create conversation/i, hidden: true })
    ).not.toBeInTheDocument();
  });

  it('should render conversation cards when data is loaded', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [mockConversations],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getByText('Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Conversation 2')).toBeInTheDocument();
  });

  it('should display total conversation count', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [mockConversations],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getByText('2 conversations')).toBeInTheDocument();
  });

  it('should display singular "conversation" when count is 1', () => {
    const singleConversation = {
      ...mockConversations,
      data: [mockConversations.data[0]],
      meta: {
        ...mockConversations.meta,
        total: 1,
      },
    };

    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [singleConversation],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getByText('1 conversation')).toBeInTheDocument();
  });

  it('should show loading indicator when fetching next page', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [mockConversations],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    const { container } = render(<ConversationList />, { wrapper: createWrapper() });

    // Should show loading spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show end of list message when no more pages', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [mockConversations],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getByText("You've reached the end of your conversations")).toBeInTheDocument();
  });

  it('should render filters component', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [mockConversations],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /technique/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
  });

  it('should not render a standalone new conversation button', () => {
    jest.spyOn(useConversationsHook, 'useInfiniteConversations').mockReturnValue({
      data: {
        pageParams: [1],
        pages: [mockConversations],
      },
      error: null,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      refetch: jest.fn(),
    } as any);

    render(<ConversationList />, { wrapper: createWrapper() });

    expect(screen.queryByRole('link', { name: /new/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /new/i })).not.toBeInTheDocument();
  });
});
