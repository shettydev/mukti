/* eslint-disable @typescript-eslint/no-require-imports */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { Conversation, SocraticTechnique } from '@/types/conversation.types';

import { isLocalMode } from '@/lib/config';
import { useDataDisclosureStore } from '@/lib/stores/data-disclosure-store';

jest.mock('@/lib/config', () => ({
  config: { api: { baseUrl: 'http://localhost:3000/api/v1' } },
  isLocalMode: jest.fn(() => false),
}));

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
  useUpdateConversation: jest.fn(),
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
  isFavorite: false,
  metadata: {
    estimatedCost: 0,
    messageCount: 2,
    totalTokens: 0,
  },
  recentMessages: [
    {
      content: 'Hello',
      role: 'user',
      sequence: 0,
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      content: 'Hi there!',
      role: 'assistant',
      sequence: 1,
      timestamp: '2024-01-01T00:00:01Z',
    },
  ],
  tags: [],
  technique: 'elenchus' as SocraticTechnique,
  title: 'Test Conversation',
  updatedAt: '2024-01-01T00:00:01Z',
  userId: 'user-123',
};

/**
 * Mirrors the shape of the real ai-store so components that read model state
 * (e.g. ChatHeader's model picker) don't blow up on missing fields.
 */
function createAiStoreState(overrides: Record<string, unknown> = {}) {
  return {
    activeModel: 'anthropic/claude-sonnet-4-6',
    hasOpenRouterKey: false,
    hydrate: jest.fn(),
    isHydrated: true,
    models: [],
    setActiveModel: jest.fn(),
    ...overrides,
  };
}

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
    localStorage.clear();
    useDataDisclosureStore.getState().close();
    (isLocalMode as jest.Mock).mockReturnValue(false);
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { useConversationStream } = require('@/lib/hooks/use-conversation-stream');
    // Default mock implementations
    const {
      useArchivedMessages,
      useConversation,
      useDeleteConversation,
      useSendMessage,
      useUpdateConversation,
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

    useUpdateConversation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
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

    useAiStore.mockReturnValue(createAiStoreState());
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

    it('waits before creating the first local conversation and sends exactly once on continue', async () => {
      (isLocalMode as jest.Mock).mockReturnValue(true);
      const onCreateConversation = jest.fn().mockResolvedValue('new-local-conversation');
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
      await userEvent.type(screen.getByPlaceholderText(/Ask me anything/i), 'Local first thought');
      await userEvent.click(screen.getByLabelText(/Send message/i));
      expect(onCreateConversation).not.toHaveBeenCalled();
      expect(useDataDisclosureStore.getState().isOpen).toBe(true);
      act(() => useDataDisclosureStore.getState().continue());
      await waitFor(() => expect(onCreateConversation).toHaveBeenCalledTimes(1));
      expect(onCreateConversation).toHaveBeenCalledWith('Local first thought', 'elenchus');
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

    it('holds a local send until continued and allows the subsequent send without reopening', async () => {
      (isLocalMode as jest.Mock).mockReturnValue(true);
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
      await userEvent.type(screen.getByPlaceholderText(/Type your message/i), 'First local send');
      await userEvent.click(screen.getByLabelText(/Send message/i));
      expect(mutateAsync).not.toHaveBeenCalled();
      expect(useDataDisclosureStore.getState().isOpen).toBe(true);
      act(() => useDataDisclosureStore.getState().continue());
      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
      expect(mutateAsync).toHaveBeenLastCalledWith({ content: 'First local send' });
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/Type your message/i)).toHaveValue('')
      );
      await userEvent.type(
        screen.getByPlaceholderText(/Type your message/i),
        'Subsequent local send'
      );
      await userEvent.click(screen.getByLabelText(/Send message/i));
      await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
      expect(mutateAsync).toHaveBeenLastCalledWith({ content: 'Subsequent local send' });
      expect(useDataDisclosureStore.getState().isOpen).toBe(false);
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

  /**
   * dialogue-help-controls in chat: the controls sit on the input, Wrap up is
   * there from the first reply, and More help / Explain go with the next send.
   */
  describe('Help controls', () => {
    const renderChat = (conversation: Partial<Conversation> = {}) => {
      const { useConversation } = require('@/lib/hooks/use-conversations');
      useConversation.mockReturnValue({
        data: { ...mockConversation, ...conversation },
        error: null,
        isLoading: false,
      });
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
      return { mutateAsync };
    };

    const send = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
      await user.type(screen.getByPlaceholderText(/Type your message/i), text);
      await user.click(screen.getByLabelText(/Send message/i));
    };

    it('shows Wrap up after one assistant reply, with no minimum message count', () => {
      renderChat();

      expect(screen.getByRole('button', { name: /wrap up/i })).toBeInTheDocument();
    });

    it('hides Wrap up until there is an assistant reply', () => {
      renderChat({
        metadata: { ...mockConversation.metadata, messageCount: 1 },
        recentMessages: [mockConversation.recentMessages[0]],
      });

      expect(screen.queryByRole('button', { name: /wrap up/i })).not.toBeInTheDocument();
    });

    it('keeps Wrap up available after an earlier wrap-up', () => {
      renderChat({ conclusionOffered: true });

      expect(screen.getByRole('button', { name: /wrap up/i })).toBeInTheDocument();
    });

    it('sends Wrap up straight away as a wrap_up control', async () => {
      const user = userEvent.setup();
      const { mutateAsync } = renderChat();

      await user.click(screen.getByRole('button', { name: /wrap up/i }));

      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          content: "Let's wrap up this conversation.",
          helpControl: 'wrap_up',
        })
      );
    });

    it('attaches Explain to the next message only', async () => {
      const user = userEvent.setup();
      const { mutateAsync } = renderChat();

      await user.click(screen.getByRole('button', { name: /explain/i }));
      await send(user, 'Why does it charge twice?');
      await waitFor(() =>
        expect(mutateAsync).toHaveBeenCalledWith({
          content: 'Why does it charge twice?',
          helpControl: 'explain',
        })
      );
      expect(screen.getByRole('button', { name: /explain/i })).toHaveAttribute(
        'aria-pressed',
        'false'
      );

      await send(user, 'I see');
      await waitFor(() => expect(mutateAsync).toHaveBeenLastCalledWith({ content: 'I see' }));
    });

    it('keeps the control selected when the message fails to send', async () => {
      const user = userEvent.setup();
      const { mutateAsync } = renderChat();
      mutateAsync.mockRejectedValueOnce(new Error('offline'));

      await user.click(screen.getByRole('button', { name: /more help/i }));
      await send(user, 'Still stuck');

      await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /more help/i })).toHaveAttribute(
          'aria-pressed',
          'true'
        )
      );
    });

    it("shows the conversation's help level", () => {
      renderChat({ currentScaffoldLevel: 2 });

      expect(screen.getByTestId('help-level')).toHaveTextContent('Hints');
    });

    it('shows and sets the turn budget', async () => {
      const user = userEvent.setup();
      const updateAsync = jest.fn().mockResolvedValue({});
      const { useUpdateConversation } = require('@/lib/hooks/use-conversations');
      useUpdateConversation.mockReturnValue({ mutateAsync: updateAsync });
      renderChat({ turnBudget: 3 });

      // 2 messages = 1 exchange of 3
      expect(screen.getByTestId('turn-budget')).toHaveTextContent('1/3 turns · 2 left');

      await user.click(screen.getByTestId('turn-budget'));
      const field = screen.getByLabelText('Turn limit (exchanges)');
      await user.clear(field);
      await user.type(field, '5');
      await user.click(screen.getByRole('button', { name: 'Set limit' }));

      await waitFor(() => expect(updateAsync).toHaveBeenCalledWith({ turnBudget: 5 }));
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

      useConversationStream.mockImplementation(
        ({ onRateLimit }: { onRateLimit?: (retryAfter: number) => void }) => {
          onRateLimitCallback = onRateLimit;
          return { isConnected: false };
        }
      );

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

      useConversationStream.mockImplementation(
        ({ onRateLimit }: { onRateLimit?: (retryAfter: number) => void }) => {
          onRateLimitCallback = onRateLimit;
          return { isConnected: false };
        }
      );

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
    it('delegates daily quota to the API rather than counting conversation messages', async () => {
      const user = userEvent.setup();
      const {
        useConversation,
        useDeleteConversation,
        useSendMessage,
      } = require('@/lib/hooks/use-conversations');
      const mutateAsync = jest.fn().mockResolvedValue({});
      useSendMessage.mockReturnValue({ isPending: false, mutateAsync, reset: jest.fn() });
      const { useAiStore } = require('@/lib/stores/ai-store');

      // Mock conversation with 10 user messages (at limit)
      const conversationAtLimit = {
        ...mockConversation,
        metadata: {
          ...mockConversation.metadata,
          messageCount: 10,
        },
        recentMessages: Array.from({ length: 10 }, (_, i) => ({
          content: `Message ${i}`,
          role: 'user' as const,
          sequence: i,
          timestamp: '2024-01-01T00:00:00Z',
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

      useAiStore.mockReturnValue(createAiStoreState({ hasOpenRouterKey: false }));

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
        expect(mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({ content: 'New message' })
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

      useAiStore.mockReturnValue(createAiStoreState({ hasOpenRouterKey: true }));

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

      let onErrorCallback: ((error: Error) => void) | undefined;

      useConversationStream.mockImplementation(
        ({ onError }: { onError?: (error: Error) => void }) => {
          onErrorCallback = onError;
          return { isConnected: false };
        }
      );

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
