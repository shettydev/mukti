import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { Conversation, SocraticTechnique } from '@/types/conversation.types';

import { ChatInterface } from '../chat-interface';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/hooks/use-conversations', () => ({
  useArchivedMessages: jest.fn(),
  useConversation: jest.fn(),
  useDeleteConversation: jest.fn(),
  useSendMessage: jest.fn(),
}));

jest.mock('@/lib/hooks/use-conversation-stream', () => ({
  SSEError: class SSEError extends Error {
    constructor(
      message: string,
      public type: string,
      public statusCode?: number
    ) {
      super(message);
    }
  },
  useConversationStream: jest.fn(),
}));

jest.mock('@/lib/stores/ai-store', () => ({
  useAiStore: jest.fn(),
}));

jest.mock('@/lib/conversation-cache', () => ({
  optimisticallyAppendUserMessage: jest.fn(),
}));

jest.mock('gsap', () => ({
  gsap: {
    context: jest.fn(() => ({ revert: jest.fn() })),
    fromTo: jest.fn(),
    to: jest.fn(),
  },
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockConversation: Conversation = {
  createdAt: '2024-01-01T00:00:00Z',
  hasArchivedMessages: false,
  id: 'conv-123',
  isArchived: false,
  recentMessages: [
    {
      content: 'Hello',
      conversationId: 'conv-123',
      createdAt: '2024-01-01T00:00:00Z',
      id: 'msg-1',
      role: 'user',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      content: 'Hi there!',
      conversationId: 'conv-123',
      createdAt: '2024-01-01T00:00:01Z',
      id: 'msg-2',
      role: 'assistant',
      updatedAt: '2024-01-01T00:00:01Z',
    },
  ],
  technique: 'elenchus' as SocraticTechnique,
  title: 'Test Conversation',
  updatedAt: '2024-01-01T00:00:01Z',
  userId: 'user-123',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { useConversationStream } = require('@/lib/hooks/use-conversation-stream');
    // Default mock implementations
    const {
      useArchivedMessages,
      useConversation,
      useDeleteConversation,
      useSendMessage,
    } = require('@/lib/hooks/use-conversations');
    const { useAiStore } = require('@/lib/stores/ai-store');

    useConversation.mockReturnValue({
      data: null,
      error: null,
      isLoading: false,
    });

    useDeleteConversation.mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    });

    useSendMessage.mockReturnValue({
      error: null,
      isPending: false,
      mutateAsync: jest.fn(),
      reset: jest.fn(),
    });

    useArchivedMessages.mockReturnValue({
      data: { pages: [] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    useConversationStream.mockReturnValue({
      isConnected: false,
    });

    useAiStore.mockReturnValue({
      hasOpenRouterKey: false,
      isHydrated: true,
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no conversation is selected', () => {
      renderWithProviders(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      expect(screen.getByText(/Choose your inquiry method/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Ask me anything/i)).toBeInTheDocument();
    });

    it('should call onCreateConversation when sending first message', async () => {
      const user = userEvent.setup();
      const onCreateConversation = jest.fn().mockResolvedValue('new-conv-123');
      const { optimisticallyAppendUserMessage } = require('@/lib/conversation-cache');
      optimisticallyAppendUserMessage.mockResolvedValue({ rollback: jest.fn() });

      renderWithProviders(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={onCreateConversation}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'Hello world');
      await user.click(sendButton);

      await waitFor(() => {
        expect(onCreateConversation).toHaveBeenCalledWith('Hello world', 'elenchus');
      });
    });

    it('should disable input when creating conversation', () => {
      renderWithProviders(
        <ChatInterface
          conversationId={null}
          isCreating
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Ask me anything/i);
      expect(input).toBeDisabled();
    });
  });

  describe('Active Conversation', () => {
    beforeEach(() => {
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');
      useConversation.mockReturnValue({
        data: mockConversation,
        error: null,
        isLoading: false,
      });
      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });
    });

    it('should render conversation header and messages', () => {
      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      expect(screen.getByText('Test Conversation')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should send message to existing conversation', async () => {
      const user = userEvent.setup();
      const mutateAsync = jest.fn().mockResolvedValue({});
      const { useSendMessage } = require('@/lib/hooks/use-conversations');

      useSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync,
        reset: jest.fn(),
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'New message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({ content: 'New message' });
      });
    });

    it('should show error banner when send fails', async () => {
      const user = userEvent.setup();
      const mutateAsync = jest.fn().mockRejectedValue(new Error('Send failed'));
      const { useSendMessage } = require('@/lib/hooks/use-conversations');

      useSendMessage.mockReturnValue({
        error: new Error('Send failed'),
        isPending: false,
        mutateAsync,
        reset: jest.fn(),
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'New message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to send message/i)).toBeInTheDocument();
      });
    });

    it('should disable input when archived', () => {
      const { useConversation } = require('@/lib/hooks/use-conversations');
      useConversation.mockReturnValue({
        data: { ...mockConversation, isArchived: true },
        error: null,
        isLoading: false,
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i);
      expect(input).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when conversation is loading', () => {
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');
      useConversation.mockReturnValue({
        data: null,
        error: null,
        isLoading: true,
      });
      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      expect(screen.getByText(/Opening conversation/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when conversation fails to load', () => {
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');
      useConversation.mockReturnValue({
        data: null,
        error: new Error('Failed to load'),
        isLoading: false,
      });
      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      expect(screen.getByText(/Error/i)).toBeInTheDocument();
    });
  });

  describe('Rate Limiting', () => {
    it('should show rate limit banner when rate limited', () => {
      const { useConversationStream } = require('@/lib/hooks/use-conversation-stream');
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');

      useConversation.mockReturnValue({
        data: mockConversation,
        error: null,
        isLoading: false,
      });

      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      let onRateLimitCallback: ((retryAfter: number) => void) | undefined;

      useConversationStream.mockImplementation(({ onRateLimit }: any) => {
        onRateLimitCallback = onRateLimit;
        return { isConnected: false };
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      // Trigger rate limit
      if (onRateLimitCallback) {
        onRateLimitCallback(60);
      }

      waitFor(() => {
        expect(screen.getByText(/Rate limit exceeded/i)).toBeInTheDocument();
      });
    });

    it('should disable input when rate limited', async () => {
      const { useConversationStream } = require('@/lib/hooks/use-conversation-stream');
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');

      useConversation.mockReturnValue({
        data: mockConversation,
        error: null,
        isLoading: false,
      });

      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      let onRateLimitCallback: ((retryAfter: number) => void) | undefined;

      useConversationStream.mockImplementation(({ onRateLimit }: any) => {
        onRateLimitCallback = onRateLimit;
        return { isConnected: false };
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      // Trigger rate limit
      if (onRateLimitCallback) {
        onRateLimitCallback(60);
      }

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Type your message/i);
        expect(input).toBeDisabled();
      });
    });
  });

  describe('Free Message Limit', () => {
    it('should enforce free message limit for users without API key', async () => {
      const user = userEvent.setup();
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');
      const { useAiStore } = require('@/lib/stores/ai-store');

      // Mock conversation with 10 user messages (at limit)
      const conversationAtLimit = {
        ...mockConversation,
        recentMessages: Array.from({ length: 10 }, (_, i) => ({
          content: `Message ${i}`,
          conversationId: 'conv-123',
          createdAt: '2024-01-01T00:00:00Z',
          id: `msg-${i}`,
          role: 'user',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
      };

      useConversation.mockReturnValue({
        data: conversationAtLimit,
        error: null,
        isLoading: false,
      });

      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      useAiStore.mockReturnValue({
        hasOpenRouterKey: false,
        isHydrated: true,
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'New message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Free message limit reached',
          expect.objectContaining({
            description: 'Connect your OpenRouter API key to continue the conversation.',
          })
        );
      });
    });

    it('should allow unlimited messages for users with API key', async () => {
      const user = userEvent.setup();
      const mutateAsync = jest.fn().mockResolvedValue({});
      const {
        useConversation,
        useDeleteConversation,
        useSendMessage,
      } = require('@/lib/hooks/use-conversations');
      const { useAiStore } = require('@/lib/stores/ai-store');

      // Mock conversation with 10 user messages
      const conversationAtLimit = {
        ...mockConversation,
        recentMessages: Array.from({ length: 10 }, (_, i) => ({
          content: `Message ${i}`,
          conversationId: 'conv-123',
          createdAt: '2024-01-01T00:00:00Z',
          id: `msg-${i}`,
          role: 'user',
          updatedAt: '2024-01-01T00:00:00Z',
        })),
      };

      useConversation.mockReturnValue({
        data: conversationAtLimit,
        error: null,
        isLoading: false,
      });

      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      useSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync,
        reset: jest.fn(),
      });

      useAiStore.mockReturnValue({
        hasOpenRouterKey: true,
        isHydrated: true,
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      const input = screen.getByPlaceholderText(/Type your message/i);
      const sendButton = screen.getByLabelText(/Send message/i);

      await user.type(input, 'New message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mutateAsync).toHaveBeenCalledWith({ content: 'New message' });
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
  });

  describe('SSE Connection', () => {
    it('should show connection status when not connected', () => {
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');
      const { useConversationStream } = require('@/lib/hooks/use-conversation-stream');

      useConversation.mockReturnValue({
        data: mockConversation,
        error: null,
        isLoading: false,
      });

      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      useConversationStream.mockReturnValue({
        isConnected: false,
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      expect(screen.getByText(/Connecting to real-time updates/i)).toBeInTheDocument();
    });

    it('should handle SSE connection errors', () => {
      const { SSEError, useConversationStream } = require('@/lib/hooks/use-conversation-stream');
      const { useConversation, useDeleteConversation } = require('@/lib/hooks/use-conversations');

      useConversation.mockReturnValue({
        data: mockConversation,
        error: null,
        isLoading: false,
      });

      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      let onErrorCallback: ((error: any) => void) | undefined;

      useConversationStream.mockImplementation(({ onError }: any) => {
        onErrorCallback = onError;
        return { isConnected: false };
      });

      renderWithProviders(
        <ChatInterface
          conversationId="conv-123"
          isCreating={false}
          onCreateConversation={jest.fn()}
          onTechniqueChange={jest.fn()}
          selectedTechnique="elenchus"
        />
      );

      // Trigger connection error
      if (onErrorCallback) {
        onErrorCallback(new SSEError('Connection failed', 'connection'));
      }

      waitFor(() => {
        expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });
  });
});
