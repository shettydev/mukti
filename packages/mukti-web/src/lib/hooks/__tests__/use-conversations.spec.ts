/**
 * Unit tests for conversation query hooks
 *
 * Tests specific examples and edge cases for TanStack Query hooks
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import type {
  Conversation,
  PaginatedConversations,
  SendMessageResponse,
} from '@/types/conversation.types';

import { conversationsApi } from '@/lib/api/conversations';

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

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
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
    expect(conversationsApi.getAll).toHaveBeenCalledWith({ page: 1 });
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
    expect(mockPush).toHaveBeenCalledWith(`/dashboard/conversations/${mockConversation.id}`);
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
    expect(mockPush).toHaveBeenCalledWith('/dashboard/conversations');
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
    expect(conversationsApi.getArchivedMessages).toHaveBeenCalledWith('507f1f77bcf86cd799439011', {
      beforeSequence: undefined,
      limit: 50,
    });
  });
});
