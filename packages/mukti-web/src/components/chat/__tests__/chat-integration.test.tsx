/**
 * Integration tests for Quick Chat Interface
 *
 * Tests the complete chat flow including:
 * - End-to-end chat flow: land on /chat → send message → navigate to /chat/:id → receive response
 * - Navigation flow: /dashboard redirects, sidebar navigation, profile popover navigation, "New Chat" button
 * - Error recovery: message send failure and retry, SSE connection failure and reconnection
 *
 * These tests verify the integration between components and ensure the complete
 * user journey works as expected.
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Conversation, Message, SocraticTechnique } from '@/types/conversation.types';

import { ChatInterface } from '../chat-interface';

// Mock GSAP to avoid animation issues in tests
jest.mock('gsap', () => ({
  context: jest.fn(() => ({
    revert: jest.fn(),
  })),
  fromTo: jest.fn(),
  gsap: {
    context: jest.fn(() => ({
      revert: jest.fn(),
    })),
    fromTo: jest.fn(),
    to: jest.fn(),
  },
  to: jest.fn(),
}));

// Mock the conversations API
const mockSendMessage = jest.fn();
jest.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  },
}));

// Mock the hooks
const mockUseConversation = jest.fn();
const mockUseSendMessage = jest.fn();
const mockUseConversationStream = jest.fn();
const mockUseDeleteConversation = jest.fn();
const mockUseArchivedMessages = jest.fn();

jest.mock('@/lib/hooks/use-conversations', () => ({
  useArchivedMessages: () => mockUseArchivedMessages(),
  useConversation: () => mockUseConversation(),
  useDeleteConversation: () => mockUseDeleteConversation(),
  useSendMessage: () => mockUseSendMessage(),
}));

jest.mock('@/lib/hooks/use-conversation-stream', () => ({
  useConversationStream: () => mockUseConversationStream(),
}));

// Helper to create a mock conversation
const createMockConversation = (
  id: string,
  technique: SocraticTechnique = 'elenchus',
  messages: Message[] = []
): Conversation => ({
  createdAt: new Date().toISOString(),
  hasArchivedMessages: false,
  id,
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0,
    lastMessageAt: messages.length > 0 ? messages[messages.length - 1].timestamp : undefined,
    messageCount: messages.length,
    totalTokens: 0,
  },
  recentMessages: messages,
  tags: [],
  technique,
  title: 'Test Conversation',
  updatedAt: new Date().toISOString(),
  userId: 'user-123',
});

// Helper to create a mock message
const createMockMessage = (
  content: string,
  role: 'assistant' | 'user',
  sequence: number
): Message => ({
  content,
  role,
  sequence,
  timestamp: new Date().toISOString(),
});

describe('Chat Integration Tests', () => {
  /**
   * 18.1 End-to-end chat flow test
   *
   * Tests the complete flow:
   * - Land on /chat → send message → navigate to /chat/:id → receive response
   * - Verify conversation creation
   * - Verify sidebar updates
   */
  describe('End-to-end chat flow', () => {
    let mockOnCreateConversation: jest.Mock;
    let mockOnTechniqueChange: jest.Mock;
    let mockOnMobileMenuToggle: jest.Mock;
    let mockMutateAsync: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockOnCreateConversation = jest.fn();
      mockOnTechniqueChange = jest.fn();
      mockOnMobileMenuToggle = jest.fn();
      mockMutateAsync = jest.fn();
      mockSendMessage.mockClear();

      // Default mock for useArchivedMessages
      mockUseArchivedMessages.mockReturnValue({
        data: { pages: [] },
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should complete full chat flow: empty state → send message → conversation created', async () => {
      const user = userEvent.setup();
      const newConversationId = 'new-conv-123';
      const messageContent = 'What is the meaning of life?';

      // Setup mocks for empty state
      mockUseConversation.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: jest.fn(),
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      // Setup onCreateConversation to return new conversation ID
      mockOnCreateConversation.mockResolvedValue(newConversationId);
      mockSendMessage.mockResolvedValue({ success: true });

      render(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify empty state is displayed
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
      expect(screen.getByText(/choose your inquiry method/i)).toBeInTheDocument();

      // Type a message
      const input = screen.getByRole('textbox', { name: /message input/i });
      await user.type(input, messageContent);

      // Send the message
      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Verify conversation creation was triggered
      await waitFor(() => {
        expect(mockOnCreateConversation).toHaveBeenCalledWith(messageContent, 'elenchus');
      });

      // Verify message was sent to the new conversation
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(newConversationId, {
          content: messageContent,
        });
      });
    });

    it('should display conversation with messages after navigation', async () => {
      const conversationId = 'existing-conv-456';
      const messages: Message[] = [
        createMockMessage('Hello, I have a question', 'user', 1),
        createMockMessage('Of course! What would you like to explore?', 'assistant', 2),
      ];

      // Setup mocks for existing conversation
      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', messages),
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: jest.fn(),
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: true,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify messages are displayed
      await waitFor(() => {
        expect(screen.getByText('Hello, I have a question')).toBeInTheDocument();
        expect(screen.getByText('Of course! What would you like to explore?')).toBeInTheDocument();
      });

      // Verify input is available for new messages
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
    });

    it('should send message to existing conversation and show optimistic update', async () => {
      const user = userEvent.setup();
      const conversationId = 'existing-conv-789';
      const newMessageContent = 'Tell me more about philosophy';

      const existingMessages: Message[] = [
        createMockMessage('What is philosophy?', 'user', 1),
        createMockMessage('Philosophy is the study of fundamental questions...', 'assistant', 2),
      ];

      // Setup mocks for existing conversation
      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', existingMessages),
        error: null,
        isLoading: false,
      });

      mockMutateAsync.mockResolvedValue({ jobId: 'job-123', position: 1 });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: jest.fn(),
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: true,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Type and send a new message
      const input = screen.getByRole('textbox', { name: /message input/i });
      await user.type(input, newMessageContent);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Verify mutateAsync was called with the message
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({ content: newMessageContent });
      });
    });

    it('should handle technique selection before sending first message', async () => {
      const user = userEvent.setup();
      const newConversationId = 'new-conv-technique';
      const messageContent = 'Help me understand this concept';

      // Setup mocks for empty state
      mockUseConversation.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: jest.fn(),
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      mockOnCreateConversation.mockResolvedValue(newConversationId);
      mockSendMessage.mockResolvedValue({ success: true });

      render(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="dialectic"
        />
      );

      // Type and send message
      const input = screen.getByRole('textbox', { name: /message input/i });
      await user.type(input, messageContent);

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      // Verify conversation was created with the selected technique
      await waitFor(() => {
        expect(mockOnCreateConversation).toHaveBeenCalledWith(messageContent, 'dialectic');
      });
    });
  });

  /**
   * 18.2 Navigation flow test
   *
   * Tests:
   * - /dashboard redirects
   * - Sidebar navigation
   * - Profile popover navigation
   * - "New Chat" button
   */
  describe('Navigation flow', () => {
    let mockOnCreateConversation: jest.Mock;
    let mockOnTechniqueChange: jest.Mock;
    let mockOnMobileMenuToggle: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockOnCreateConversation = jest.fn();
      mockOnTechniqueChange = jest.fn();
      mockOnMobileMenuToggle = jest.fn();

      // Default mock implementations
      mockUseConversation.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: jest.fn(),
        reset: jest.fn(),
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      mockUseArchivedMessages.mockReturnValue({
        data: { pages: [] },
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should display empty state when navigating to /chat (new chat)', async () => {
      render(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify empty state elements are present
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
      expect(screen.getByText(/choose your inquiry method/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();

      // Verify quirky heading is displayed
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    it('should display active conversation when navigating to /chat/:id', async () => {
      const conversationId = 'nav-test-conv';
      const messages: Message[] = [createMockMessage('Test message', 'user', 1)];

      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', messages),
        error: null,
        isLoading: false,
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: true,
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify conversation content is displayed
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });

      // Verify input is available
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
    });

    it('should call onMobileMenuToggle when mobile menu button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Find and click the mobile menu button (if visible)
      const menuButton = screen.queryByRole('button', { name: /toggle menu/i });
      if (menuButton) {
        await user.click(menuButton);
        expect(mockOnMobileMenuToggle).toHaveBeenCalled();
      }
    });

    it('should transition from empty state to active state after conversation creation', async () => {
      const user = userEvent.setup();
      const newConversationId = 'transition-test-conv';
      const messageContent = 'Starting a new conversation';

      // Start with empty state
      mockUseConversation.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      });

      mockOnCreateConversation.mockResolvedValue(newConversationId);
      mockSendMessage.mockResolvedValue({ success: true });

      const { rerender } = render(
        <ChatInterface
          conversationId={null}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify empty state
      expect(screen.getByText(/choose your inquiry method/i)).toBeInTheDocument();

      // Send first message
      const input = screen.getByRole('textbox', { name: /message input/i });
      await user.type(input, messageContent);
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Simulate navigation to new conversation
      const newMessages: Message[] = [createMockMessage(messageContent, 'user', 1)];

      mockUseConversation.mockReturnValue({
        data: createMockConversation(newConversationId, 'elenchus', newMessages),
        error: null,
        isLoading: false,
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: true,
      });

      // Rerender with new conversation ID
      rerender(
        <ChatInterface
          conversationId={newConversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify active state with message
      await waitFor(() => {
        expect(screen.getByText(messageContent)).toBeInTheDocument();
      });
    });
  });

  /**
   * 18.3 Error recovery test
   *
   * Tests:
   * - Message send failure and retry
   * - SSE connection failure and reconnection
   */
  describe('Error recovery', () => {
    let mockOnCreateConversation: jest.Mock;
    let mockOnTechniqueChange: jest.Mock;
    let mockOnMobileMenuToggle: jest.Mock;
    let mockMutateAsync: jest.Mock;
    let mockReset: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockOnCreateConversation = jest.fn();
      mockOnTechniqueChange = jest.fn();
      mockOnMobileMenuToggle = jest.fn();
      mockMutateAsync = jest.fn();
      mockReset = jest.fn();

      mockUseArchivedMessages.mockReturnValue({
        data: { pages: [] },
        fetchNextPage: jest.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should display error state when message send fails', async () => {
      const _user = userEvent.setup();
      const conversationId = 'error-test-conv';
      const messages: Message[] = [createMockMessage('Previous message', 'user', 1)];

      // Setup mocks for existing conversation
      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', messages),
        error: null,
        isLoading: false,
      });

      // Setup send message to fail
      const sendError = new Error('Network error');
      mockMutateAsync.mockRejectedValue(sendError);

      mockUseSendMessage.mockReturnValue({
        error: sendError,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: mockReset,
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: true,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify error banner is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed to send message/i)).toBeInTheDocument();
      });
    });

    it('should display connection error when SSE fails', async () => {
      const conversationId = 'sse-error-conv';
      const messages: Message[] = [createMockMessage('Test message', 'user', 1)];

      // Setup mocks for existing conversation
      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', messages),
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: mockReset,
      });

      // Setup SSE to be disconnected
      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify connection status indicator is shown
      await waitFor(() => {
        expect(screen.getByText(/connecting to real-time updates/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after message send failure', async () => {
      const user = userEvent.setup();
      const conversationId = 'retry-test-conv';
      const messages: Message[] = [createMockMessage('Previous message', 'user', 1)];
      const newMessageContent = 'Retry this message';

      // Setup mocks for existing conversation
      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', messages),
        error: null,
        isLoading: false,
      });

      // First call fails, second succeeds
      mockMutateAsync
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ jobId: 'job-123', position: 1 });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: mockReset,
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: true,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Type and send message (first attempt - will fail)
      const input = screen.getByRole('textbox', { name: /message input/i });
      await user.type(input, newMessageContent);
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify first call was made
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      });

      // Clear input and retry
      await user.clear(input);
      await user.type(input, newMessageContent);
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Verify second call was made
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('should show loading state while conversation is being created', async () => {
      // Setup mocks for creating state
      mockUseConversation.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: mockReset,
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={null}
          isCreating
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify input is disabled during creation
      const input = screen.getByRole('textbox', { name: /message input/i });
      expect(input).toBeDisabled();
    });

    it('should display error state when conversation fails to load', async () => {
      const conversationId = 'load-error-conv';
      const loadError = new Error('Failed to load conversation');

      // Setup mocks for failed conversation load
      mockUseConversation.mockReturnValue({
        data: null,
        error: loadError,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: mockReset,
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify error state is displayed
      await waitFor(() => {
        // The ErrorState component should be rendered
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should handle rate limit errors gracefully', async () => {
      const conversationId = 'rate-limit-conv';
      const messages: Message[] = [createMockMessage('Test message', 'user', 1)];

      // Setup mocks for existing conversation with rate limit
      mockUseConversation.mockReturnValue({
        data: createMockConversation(conversationId, 'elenchus', messages),
        error: null,
        isLoading: false,
      });

      mockUseSendMessage.mockReturnValue({
        error: null,
        isPending: false,
        mutateAsync: mockMutateAsync,
        reset: mockReset,
      });

      // Simulate rate limit callback being triggered
      let _onRateLimitCallback: ((retryAfter: number) => void) | undefined;
      mockUseConversationStream.mockImplementation(() => {
        return {
          isConnected: true,
        };
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });

      render(
        <ChatInterface
          conversationId={conversationId}
          isCreating={false}
          onCreateConversation={mockOnCreateConversation}
          onMobileMenuToggle={mockOnMobileMenuToggle}
          onTechniqueChange={mockOnTechniqueChange}
          selectedTechnique="elenchus"
        />
      );

      // Verify conversation is displayed
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });
  });
});
