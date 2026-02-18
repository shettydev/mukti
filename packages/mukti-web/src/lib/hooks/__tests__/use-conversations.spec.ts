/**
 * Unit tests for conversation query hooks
 *
 * Tests specific examples and edge cases for TanStack Query hooks
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import type {
  Conversation,
  PaginatedConversations,
  SendMessageResponse,
} from '@/types/conversation.types';

import { conversationsApi } from '@/lib/api/conversations';
import { conversationKeys } from '@/lib/query-keys';

import {
  useArchivedMessages,
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useInfiniteConversations,
  useSendMessage,
  useUpdateConversation,
} from '../use-conversations';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the API
jest.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    create: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(),
    getArchivedMessages: jest.fn(),
    getById: jest.fn(),
    sendMessage: jest.fn(),
    update: jest.fn(),
  },
}));

/**
 * Create a wrapper with QueryClient for testing hooks
 */
function createWrapper() {
  return createWrapperWithClient().wrapper;
}

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };

  return { queryClient, wrapper };
}

const mockConversation: Conversation = {
  createdAt: '2024-01-01T00:00:00Z',
  hasArchivedMessages: false,
  id: '507f1f77bcf86cd799439011',
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0,
    messageCount: 2,
    totalTokens: 100,
  },
  recentMessages: [
    {
      content: 'Hello',
      role: 'user',
      sequence: 1,
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  tags: ['test'],
  technique: 'elenchus',
  title: 'Test Conversation',
  updatedAt: '2024-01-01T00:01:00Z',
  userId: '507f1f77bcf86cd799439012',
};

describe('useConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch conversation successfully', async () => {
    (
      conversationsApi.getById as jest.MockedFunction<typeof conversationsApi.getById>
    ).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversation('507f1f77bcf86cd799439011'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConversation);
    expect(conversationsApi.getById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch');
    (
      conversationsApi.getById as jest.MockedFunction<typeof conversationsApi.getById>
    ).mockRejectedValue(error);

    const { result } = renderHook(() => useConversation('507f1f77bcf86cd799439011'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });

  it('preserves optimistic messages when a refetch returns fewer messages', async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const optimisticConversation: Conversation = {
      ...mockConversation,
      metadata: {
        ...mockConversation.metadata,
        lastMessageAt: '2024-01-01T00:00:00Z',
        messageCount: 1,
      },
      recentMessages: [
        {
          content: 'Optimistic first message',
          role: 'user',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const staleServerConversation: Conversation = {
      ...mockConversation,
      metadata: {
        ...mockConversation.metadata,
        lastMessageAt: undefined,
        messageCount: 0,
      },
      recentMessages: [],
      updatedAt: '2023-12-31T23:59:00Z',
    };

    queryClient.setQueryData(conversationKeys.detail(mockConversation.id), optimisticConversation);
    (
      conversationsApi.getById as jest.MockedFunction<typeof conversationsApi.getById>
    ).mockResolvedValue(staleServerConversation);

    const { result } = renderHook(() => useConversation(mockConversation.id), {
      wrapper,
    });

    expect(result.current.data?.recentMessages[0]?.content).toBe('Optimistic first message');

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.data?.recentMessages).toHaveLength(1));

    expect(result.current.data?.recentMessages[0]?.content).toBe('Optimistic first message');
    expect(result.current.data?.metadata.messageCount).toBe(1);
  });
});

describe('useInfiniteConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch conversations with pagination', async () => {
    const mockData: PaginatedConversations = {
      data: [mockConversation],
      meta: {
        limit: 20,
        page: 1,
        total: 1,
        totalPages: 1,
      },
    };

    (
      conversationsApi.getAll as jest.MockedFunction<typeof conversationsApi.getAll>
    ).mockResolvedValue(mockData);

    const { result } = renderHook(() => useInfiniteConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]).toEqual(mockData);
    // Default pagination limit (20) is now included from centralized config
    expect(conversationsApi.getAll).toHaveBeenCalledWith({ limit: 20, page: 1 });
  });
});

describe('useCreateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create conversation successfully', async () => {
    (
      conversationsApi.create as jest.MockedFunction<typeof conversationsApi.create>
    ).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    const dto = { tags: ['test'], technique: 'elenchus' as const, title: 'New Conversation' };
    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(conversationsApi.create).toHaveBeenCalledWith(dto);
    expect(result.current.data).toEqual(mockConversation);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('useUpdateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update conversation successfully', async () => {
    const updatedConversation = { ...mockConversation, title: 'Updated Title' };
    (
      conversationsApi.update as jest.MockedFunction<typeof conversationsApi.update>
    ).mockResolvedValue(updatedConversation);

    const { result } = renderHook(() => useUpdateConversation('507f1f77bcf86cd799439011'), {
      wrapper: createWrapper(),
    });

    const dto = { title: 'Updated Title' };
    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(conversationsApi.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', dto);
    expect(result.current.data).toEqual(updatedConversation);
  });
});

describe('useDeleteConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete conversation successfully', async () => {
    (
      conversationsApi.delete as jest.MockedFunction<typeof conversationsApi.delete>
    ).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('507f1f77bcf86cd799439011');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(conversationsApi.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    expect(mockPush).toHaveBeenCalledWith('/chat');
  });
});

describe('useSendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send message successfully', async () => {
    const mockResponse: SendMessageResponse = {
      jobId: 'job123',
      position: 1,
    };

    (
      conversationsApi.sendMessage as jest.MockedFunction<typeof conversationsApi.sendMessage>
    ).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSendMessage('507f1f77bcf86cd799439011'), {
      wrapper: createWrapper(),
    });

    const dto = { content: 'Hello world' };
    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(conversationsApi.sendMessage).toHaveBeenCalledWith('507f1f77bcf86cd799439011', dto);
    expect(result.current.data).toEqual(mockResponse);
  });

  it('falls back to refetching conversation details when SSE assistant message is delayed', async () => {
    const conversationId = '507f1f77bcf86cd799439011';
    const { queryClient, wrapper } = createWrapperWithClient();
    queryClient.setQueryData(conversationKeys.detail(conversationId), {
      ...mockConversation,
      metadata: {
        ...mockConversation.metadata,
        messageCount: 1,
      },
      recentMessages: [
        {
          content: 'Hello',
          role: 'user',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ],
    });

    (
      conversationsApi.sendMessage as jest.MockedFunction<typeof conversationsApi.sendMessage>
    ).mockResolvedValue({
      jobId: 'job-fallback',
      position: 1,
    });
    (
      conversationsApi.getById as jest.MockedFunction<typeof conversationsApi.getById>
    ).mockResolvedValue({
      ...mockConversation,
      metadata: {
        ...mockConversation.metadata,
        messageCount: 2,
      },
      recentMessages: [
        {
          content: 'Hello',
          role: 'user',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          content: 'Fallback assistant response',
          role: 'assistant',
          sequence: 2,
          timestamp: '2024-01-01T00:00:02Z',
        },
      ],
    });

    const { result } = renderHook(() => useSendMessage(conversationId), {
      wrapper,
    });

    result.current.mutate({ content: 'Trigger fallback' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => expect(conversationsApi.getById).toHaveBeenCalledWith(conversationId));
  });
});

describe('useArchivedMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch archived messages', async () => {
    const mockMessages = [
      {
        content: 'Old message',
        role: 'user' as const,
        sequence: 1,
        timestamp: '2024-01-01T00:00:00Z',
      },
    ];

    (
      conversationsApi.getArchivedMessages as jest.MockedFunction<
        typeof conversationsApi.getArchivedMessages
      >
    ).mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useArchivedMessages('507f1f77bcf86cd799439011'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]).toEqual(mockMessages);
    // Uses centralized pagination config (20 items per page)
    expect(conversationsApi.getArchivedMessages).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      beforeSequence: undefined,
      limit: 20,
    });
  });
});
