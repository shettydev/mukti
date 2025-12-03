/**
 * Unit tests for ConversationDetail component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Conversation } from '@/types/conversation.types';

import * as useConversationsHook from '@/lib/hooks/use-conversations';

import { ConversationDetail } from '../conversation-detail';

// Mock the hooks
jest.mock('@/lib/hooks/use-conversations', () => ({
  useArchivedMessages: jest.fn(() => ({
    data: undefined,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
  useConversation: jest.fn(),
  useDeleteConversation: jest.fn(),
  useSendMessage: jest.fn(),
  useUpdateConversation: jest.fn(),
}));

jest.mock('@/lib/hooks/use-conversation-stream', () => ({
  useConversationStream: jest.fn(() => ({
    error: null,
    isConnected: false,
  })),
}));

describe('ConversationDetail', () => {
  const mockConversation: Conversation = {
    createdAt: '2024-01-01T12:00:00Z',
    hasArchivedMessages: false,
    id: 'test-id',
    isArchived: false,
    isFavorite: false,
    metadata: {
      estimatedCost: 0.01,
      lastMessageAt: '2024-01-01T12:05:00Z',
      messageCount: 2,
      totalTokens: 100,
    },
    recentMessages: [
      {
        content: 'Test message 1',
        role: 'user',
        sequence: 1,
        timestamp: '2024-01-01T12:00:00Z',
      },
      {
        content: 'Test message 2',
        role: 'assistant',
        sequence: 2,
        timestamp: '2024-01-01T12:01:00Z',
      },
    ],
    tags: ['test', 'example'],
    technique: 'elenchus',
    title: 'Test Conversation',
    updatedAt: '2024-01-01T12:05:00Z',
    userId: 'user-123',
  };

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

  it('should render conversation details', () => {
    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: mockConversation,
      error: null,
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    expect(screen.getByText(/elenchus/i)).toBeInTheDocument();
    expect(screen.getByText(/2 messages/i)).toBeInTheDocument();
    expect(screen.getByText(/test, example/i)).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    // Check for skeleton elements (they have specific test IDs or classes)
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show 404 error state when conversation not found', () => {
    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: undefined,
      error: new Error('Conversation not found'),
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    expect(screen.getByText(/conversation not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to conversations/i })).toBeInTheDocument();
  });

  it('should show generic error state for other errors', () => {
    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: undefined,
      error: new Error('Network error'),
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    expect(screen.getByText(/error loading conversation/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to load conversation/i)).toBeInTheDocument();
  });

  it('should toggle favorite when star button clicked', async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn();

    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: mockConversation,
      error: null,
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: updateMutate,
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    const favoriteButton = screen.getByLabelText(/add to favorites/i);
    await user.click(favoriteButton);

    expect(updateMutate).toHaveBeenCalledWith({ isFavorite: true });
  });

  it('should toggle archive when archive menu item clicked', async () => {
    const user = userEvent.setup();
    const updateMutate = jest.fn();

    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: mockConversation,
      error: null,
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: updateMutate,
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    // Open dropdown menu
    const moreButton = screen.getByRole('button', { name: /more options/i });
    await user.click(moreButton);

    // Click archive
    const archiveItem = screen.getByRole('menuitem', { name: /archive/i });
    await user.click(archiveItem);

    expect(updateMutate).toHaveBeenCalledWith({ isArchived: true });
  });

  it('should show confirmation and delete when delete clicked', async () => {
    const user = userEvent.setup();
    const deleteMutate = jest.fn();

    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: mockConversation,
      error: null,
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: deleteMutate,
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    // Open dropdown menu
    const moreButton = screen.getByRole('button', { name: /more options/i });
    await user.click(moreButton);

    // Click delete
    const deleteItem = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteItem);

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutate).toHaveBeenCalledWith('test-id');

    confirmSpy.mockRestore();
  });

  it('should not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const deleteMutate = jest.fn();

    // Mock window.confirm to return false
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: mockConversation,
      error: null,
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: deleteMutate,
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    // Open dropdown menu
    const moreButton = screen.getByRole('button', { name: /more options/i });
    await user.click(moreButton);

    // Click delete
    const deleteItem = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteItem);

    expect(confirmSpy).toHaveBeenCalled();
    expect(deleteMutate).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should render MessageList with conversation data', () => {
    (useConversationsHook.useConversation as jest.Mock).mockReturnValue({
      data: mockConversation,
      error: null,
      isLoading: false,
    } as any);

    (useConversationsHook.useUpdateConversation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useDeleteConversation as jest.Mock).mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as any);

    (useConversationsHook.useSendMessage as jest.Mock).mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
    } as any);

    render(<ConversationDetail conversationId="test-id" />, { wrapper: createWrapper() });

    // MessageList should render the messages
    expect(screen.getByText('Test message 1')).toBeInTheDocument();
    expect(screen.getByText('Test message 2')).toBeInTheDocument();
  });
});
