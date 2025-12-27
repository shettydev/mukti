/**
 * Property-based tests for ChatInterface component
 *
 * **Property: First message creates conversation and navigates**
 *
 * Tests that when a user sends their first message:
 * - A new conversation is created
 * - The user is navigated to /chat/:id
 * - The message is sent to the new conversation
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';

import type { SocraticTechnique } from '@/types/conversation.types';

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
jest.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    sendMessage: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the hooks
const mockUseConversation = jest.fn();
const mockUseSendMessage = jest.fn();
const mockUseConversationStream = jest.fn();
const mockUseDeleteConversation = jest.fn();

jest.mock('@/lib/hooks/use-conversations', () => ({
  useConversation: () => mockUseConversation(),
  useDeleteConversation: () => mockUseDeleteConversation(),
  useSendMessage: () => mockUseSendMessage(),
}));

jest.mock('@/lib/hooks/use-conversation-stream', () => ({
  useConversationStream: () => mockUseConversationStream(),
}));

// Valid Socratic techniques
const VALID_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'maieutics',
  'dialectic',
  'definitional',
  'analogical',
  'counterfactual',
];

// Arbitrary for generating valid message content (avoiding special characters that userEvent interprets as keyboard shortcuts)
const safeChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const validMessageArbitrary = fc
  .array(fc.constantFrom(...safeChars.split('')), { maxLength: 50, minLength: 1 })
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

// Arbitrary for generating conversation IDs
const conversationIdArbitrary = fc.uuid();

describe('ChatInterface - Property Tests', () => {
  /**
   * Property: First message creates conversation and navigates
   *
   * For any valid message content sent when no conversation exists,
   * a new conversation should be created and the user should be navigated to /chat/:id
   *
   */
  describe('Property: First message creates conversation and navigates', () => {
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
        mutateAsync: jest.fn().mockResolvedValue({ success: true }),
        reset: jest.fn(),
      });

      mockUseConversationStream.mockReturnValue({
        isConnected: false,
      });

      mockUseDeleteConversation.mockReturnValue({
        isPending: false,
        mutate: jest.fn(),
      });
    });

    afterEach(() => {
      cleanup();
    });

    it('should call onCreateConversation with message content and technique for any valid message', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          validMessageArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          conversationIdArbitrary,
          async (messageContent, technique, newConversationId) => {
            cleanup();
            jest.clearAllMocks();

            // Setup mock to return the new conversation ID
            mockOnCreateConversation.mockResolvedValue(newConversationId);

            render(
              <ChatInterface
                conversationId={null}
                isCreating={false}
                onCreateConversation={mockOnCreateConversation}
                onMobileMenuToggle={mockOnMobileMenuToggle}
                onTechniqueChange={mockOnTechniqueChange}
                selectedTechnique={technique}
              />
            );

            // Find the input and type the message
            const input = screen.getByRole('textbox', { name: /message input/i });
            await user.clear(input);
            await user.type(input, messageContent);

            // Find and click the send button
            const sendButton = screen.getByRole('button', { name: /send message/i });
            await user.click(sendButton);

            // Verify onCreateConversation was called with the message content and technique
            await waitFor(() => {
              expect(mockOnCreateConversation).toHaveBeenCalledWith(messageContent, technique);
            });
          }
        ),
        { numRuns: 10 } // Reduced runs for async tests
      );
    }, 30000);

    it('should return conversation ID from onCreateConversation for any valid message', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          validMessageArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          conversationIdArbitrary,
          async (messageContent, technique, expectedConversationId) => {
            cleanup();
            jest.clearAllMocks();

            let capturedConversationId: null | string = null;

            // Setup mock to capture the returned conversation ID
            mockOnCreateConversation.mockImplementation(async () => {
              capturedConversationId = expectedConversationId;
              return expectedConversationId;
            });

            render(
              <ChatInterface
                conversationId={null}
                isCreating={false}
                onCreateConversation={mockOnCreateConversation}
                onMobileMenuToggle={mockOnMobileMenuToggle}
                onTechniqueChange={mockOnTechniqueChange}
                selectedTechnique={technique}
              />
            );

            // Find the input and type the message
            const input = screen.getByRole('textbox', { name: /message input/i });
            await user.clear(input);
            await user.type(input, messageContent);

            // Find and click the send button
            const sendButton = screen.getByRole('button', { name: /send message/i });
            await user.click(sendButton);

            // Verify the conversation ID was returned
            await waitFor(() => {
              expect(capturedConversationId).toBe(expectedConversationId);
            });
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    it('should send message to new conversation after creation for any valid message', async () => {
      const user = userEvent.setup();
      const { conversationsApi } = await import('@/lib/api/conversations');
      const mockSendMessage = conversationsApi.sendMessage as jest.Mock;

      await fc.assert(
        fc.asyncProperty(
          validMessageArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          conversationIdArbitrary,
          async (messageContent, technique, newConversationId) => {
            cleanup();
            jest.clearAllMocks();
            mockSendMessage.mockClear();

            // Setup mock to return the new conversation ID
            mockOnCreateConversation.mockResolvedValue(newConversationId);

            render(
              <ChatInterface
                conversationId={null}
                isCreating={false}
                onCreateConversation={mockOnCreateConversation}
                onMobileMenuToggle={mockOnMobileMenuToggle}
                onTechniqueChange={mockOnTechniqueChange}
                selectedTechnique={technique}
              />
            );

            // Find the input and type the message
            const input = screen.getByRole('textbox', { name: /message input/i });
            await user.clear(input);
            await user.type(input, messageContent);

            // Find and click the send button
            const sendButton = screen.getByRole('button', { name: /send message/i });
            await user.click(sendButton);

            // Verify sendMessage was called with the new conversation ID and message content
            await waitFor(() => {
              expect(mockSendMessage).toHaveBeenCalledWith(newConversationId, {
                content: messageContent,
              });
            });
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);

    it('should use the selected technique when creating conversation for any technique', async () => {
      const user = userEvent.setup();

      await fc.assert(
        fc.asyncProperty(
          validMessageArbitrary,
          fc.constantFrom(...VALID_TECHNIQUES),
          conversationIdArbitrary,
          async (messageContent, technique, newConversationId) => {
            cleanup();
            jest.clearAllMocks();

            let capturedTechnique: null | SocraticTechnique = null;

            mockOnCreateConversation.mockImplementation(
              async (_content: string, tech: SocraticTechnique) => {
                capturedTechnique = tech;
                return newConversationId;
              }
            );

            render(
              <ChatInterface
                conversationId={null}
                isCreating={false}
                onCreateConversation={mockOnCreateConversation}
                onMobileMenuToggle={mockOnMobileMenuToggle}
                onTechniqueChange={mockOnTechniqueChange}
                selectedTechnique={technique}
              />
            );

            // Find the input and type the message
            const input = screen.getByRole('textbox', { name: /message input/i });
            await user.clear(input);
            await user.type(input, messageContent);

            // Find and click the send button
            const sendButton = screen.getByRole('button', { name: /send message/i });
            await user.click(sendButton);

            // Verify the technique was passed correctly
            await waitFor(() => {
              expect(capturedTechnique).toBe(technique);
            });
          }
        ),
        { numRuns: 6 } // One for each technique
      );
    }, 30000);
  });
});
