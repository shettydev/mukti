'use client';

/**
 * ChatInterface component - Main chat UI
 *
 * Handles conditional rendering between EmptyState and ActiveState.
 * Manages conversation state transitions and message sending.
 *
 * Features:
 * - Empty state with centered input (no conversation)
 * - Active state with message list and input bar (existing conversation)
 * - Conversation creation on first message
 * - Automatic navigation to conversation detail
 * - SSE streaming integration
 * - Comprehensive error handling for message sending and streaming
 *
 */

import { AlertCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { SocraticTechnique } from '@/types/conversation.types';

import { ErrorState } from '@/components/conversations/error-state';
import { MessageInput } from '@/components/conversations/message-input';
import { MessageList } from '@/components/conversations/message-list';
import { RateLimitBanner } from '@/components/conversations/rate-limit-banner';
import { Button } from '@/components/ui/button';
import { type SSEError, useConversationStream } from '@/lib/hooks/use-conversation-stream';
import { useConversation, useSendMessage } from '@/lib/hooks/use-conversations';

import { EmptyState } from './empty-state';

interface ChatInterfaceProps {
  conversationId: null | string;
  isCreating: boolean;
  isTransitioning?: boolean;
  onCreateConversation: (content: string, technique: SocraticTechnique) => Promise<string>;
  onTechniqueChange: (technique: SocraticTechnique) => void;
  selectedTechnique: SocraticTechnique;
}

/**
 * ChatInterface component
 *
 * Conditionally renders EmptyState or ActiveState based on conversation existence.
 * Handles conversation creation and message sending with comprehensive error handling.
 */
export function ChatInterface({
  conversationId,
  isCreating,
  isTransitioning = false,
  onCreateConversation,
  onTechniqueChange,
  selectedTechnique,
}: ChatInterfaceProps) {
  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean;
    queuePosition?: number;
    status: string;
  }>({
    isProcessing: false,
    status: '',
  });

  // Error states
  const [streamError, setStreamError] = useState<null | SSEError>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<null | { retryAfter: number }>(null);

  // Fetch conversation data if we have an ID
  const { data: conversation, error: conversationError } = useConversation(conversationId || '');
  const {
    error: sendError,
    isPending: isSending,
    mutateAsync: sendMessage,
    reset: resetSendMutation,
  } = useSendMessage(conversationId || '');

  // Establish SSE connection for active conversation
  const { isConnected } = useConversationStream({
    conversationId: conversationId || '',
    enabled: !!conversationId && !!conversation,
    onComplete: () => {
      setProcessingState({
        isProcessing: false,
        status: '',
      });
      // Clear any previous errors on successful completion
      setStreamError(null);
    },
    onError: (error) => {
      // Handle SSE connection errors
      setStreamError(error);

      // Show toast notification for connection errors
      if (error.type === 'connection' || error.type === 'server') {
        toast.error('Connection Error', {
          description: error.message,
        });
      } else if (error.type === 'authentication') {
        toast.error('Authentication Required', {
          description: 'Please log in again to continue.',
        });
      } else if (error.type === 'authorization') {
        toast.error('Access Denied', {
          description: error.message,
        });
      }
    },
    onErrorEvent: (event) => {
      // Handle error events from the stream
      setProcessingState({
        isProcessing: false,
        status: '',
      });

      toast.error('Processing Error', {
        description: event.data.message,
      });
    },
    onProcessing: (event) => {
      setProcessingState({
        isProcessing: true,
        queuePosition: event.data.position,
        status: 'AI is thinking...',
      });
      // Clear any previous errors when processing starts
      setStreamError(null);
    },
    onProgress: (event) => {
      setProcessingState((prev) => ({
        ...prev,
        queuePosition: event.data.position,
        status: event.data.status,
      }));
    },
    onRateLimit: (retryAfter) => {
      // Handle rate limit errors
      setRateLimitInfo({ retryAfter: retryAfter || 60 });
      setProcessingState({
        isProcessing: false,
        status: '',
      });
    },
  });

  /**
   * Handle sending first message (creates conversation)
   *
   * Flow:
   * 1. Create conversation with title and technique
   * 2. Get new conversation ID
   * 3. Send message to new conversation
   * 4. Parent handles navigation
   */
  const handleSendFirstMessage = useCallback(
    async (content: string): Promise<void> => {
      // Create conversation and get ID
      const newConversationId = await onCreateConversation(content, selectedTechnique);

      // Send the first message to the new conversation
      // We need to use the conversations API directly since we don't have
      // the mutation hook set up for this conversation yet
      const { conversationsApi } = await import('@/lib/api/conversations');
      await conversationsApi.sendMessage(newConversationId, { content });
    },
    [onCreateConversation, selectedTechnique]
  );

  /**
   * Handle sending message to existing conversation
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) {
        return;
      }

      try {
        // Clear any previous errors
        resetSendMutation();
        await sendMessage({ content });
      } catch (error) {
        // Error is already handled by the mutation's onError
        // Show toast notification
        toast.error('Failed to send message', {
          description: 'Please try again.',
        });
        throw error; // Re-throw so MessageInput can handle it
      }
    },
    [conversationId, sendMessage, resetSendMutation]
  );

  /**
   * Handle retry for streaming errors
   */
  const handleRetryStream = useCallback(() => {
    setStreamError(null);
    // The SSE hook will automatically reconnect when error is cleared
  }, []);

  /**
   * Handle dismissing rate limit banner
   */
  const handleDismissRateLimit = useCallback(() => {
    setRateLimitInfo(null);
  }, []);

  // Show empty state if no conversation
  if (!conversationId || !conversation) {
    return (
      <EmptyState
        isCreating={isCreating}
        isTransitioning={isTransitioning}
        onSendMessage={handleSendFirstMessage}
        onTechniqueChange={onTechniqueChange}
        selectedTechnique={selectedTechnique}
      />
    );
  }

  // Show error state if conversation failed to load
  if (conversationError && conversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState error={conversationError} onRetry={() => window.location.reload()} showRetry />
      </div>
    );
  }

  // Show active conversation state
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Rate limit banner */}
      {rateLimitInfo && (
        <div className="border-b p-4">
          <RateLimitBanner
            onDismiss={handleDismissRateLimit}
            retryAfter={rateLimitInfo.retryAfter}
          />
        </div>
      )}

      {/* Streaming error banner */}
      {streamError && streamError.type !== 'rate_limit' && (
        <div className="border-b bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Connection Error</p>
              <p className="text-sm text-muted-foreground">{streamError.message}</p>
            </div>
            {streamError.type === 'connection' || streamError.type === 'server' ? (
              <Button onClick={handleRetryStream} size="sm" variant="outline">
                Retry Connection
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* Connection status indicator (subtle) */}
      {conversationId && !isConnected && !streamError && (
        <div className="border-b bg-muted/50 px-4 py-2">
          <p className="text-xs text-muted-foreground">Connecting to real-time updates...</p>
        </div>
      )}

      {/* Message list */}
      <MessageList
        conversationId={conversationId}
        hasArchivedMessages={conversation.hasArchivedMessages}
        processingState={processingState}
        recentMessages={conversation.recentMessages}
      />

      {/* Send error banner (shown above input) */}
      {sendError && (
        <div className="border-t bg-destructive/10 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">Failed to send message. Please try again.</p>
          </div>
        </div>
      )}

      {/* Message input */}
      <MessageInput
        conversationId={conversationId}
        disabled={isSending || conversation.isArchived || !!rateLimitInfo}
        onSend={handleSendMessage}
        technique={conversation.technique}
      />
    </div>
  );
}
