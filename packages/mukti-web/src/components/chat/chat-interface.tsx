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

import { useQueryClient } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { SocraticTechnique } from '@/types/conversation.types';

import { ErrorState } from '@/components/conversations/error-state';
import { MessageInput } from '@/components/conversations/message-input';
import { MessageList } from '@/components/conversations/message-list';
import { RateLimitBanner } from '@/components/conversations/rate-limit-banner';
import { Button } from '@/components/ui/button';
import { optimisticallyAppendUserMessage } from '@/lib/conversation-cache';
import { type SSEError, useConversationStream } from '@/lib/hooks/use-conversation-stream';
import { useConversation, useSendMessage } from '@/lib/hooks/use-conversations';

import { ChatHeader } from './chat-header';
import { EmptyState } from './empty-state';

interface ChatInterfaceProps {
  conversationId: null | string;
  isCreating: boolean;
  isTransitioning?: boolean;
  onCreateConversation: (content: string, technique: SocraticTechnique) => Promise<string>;
  onMobileMenuToggle?: () => void;
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
  onMobileMenuToggle,
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
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch conversation data if we have an ID
  const {
    data: conversation,
    error: conversationError,
    isLoading,
  } = useConversation(conversationId || '');

  // Loading screen state (prevents empty-state flash + adds polish)
  const [showLoading, setShowLoading] = useState(false);
  const [isLoadingExiting, setIsLoadingExiting] = useState(false);
  const loadingStartRef = useRef(0);

  useEffect(() => {
    const MIN_LOADING_MS = 350;

    if (!conversationId) {
      setShowLoading(false);
      setIsLoadingExiting(false);
      return;
    }

    // Start loading
    if (isLoading) {
      setIsLoadingExiting(false);
      if (!showLoading) {
        loadingStartRef.current = Date.now();
        setShowLoading(true);
      }
      return;
    }

    // Finish loading (with minimum display time + exit animation)
    if (showLoading && !isLoadingExiting) {
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

      const t = window.setTimeout(() => {
        setIsLoadingExiting(true);
      }, remaining);

      return () => window.clearTimeout(t);
    }
  }, [conversationId, isLoading, showLoading, isLoadingExiting]);

  useEffect(() => {
    const EXIT_MS = 220;

    if (!isLoadingExiting) {
      return;
    }

    const t = window.setTimeout(() => {
      setShowLoading(false);
      setIsLoadingExiting(false);
    }, EXIT_MS);

    return () => window.clearTimeout(t);
  }, [isLoadingExiting]);
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
      setProcessingState({
        isProcessing: false,
        status: '',
      });

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
   * 3. Seed optimistic message cache and navigate to conversation
   * 4. Send message to new conversation
   */
  const handleSendFirstMessage = useCallback(
    async (content: string): Promise<void> => {
      // Create conversation and get ID
      const newConversationId = await onCreateConversation(content, selectedTechnique);

      const { rollback } = await optimisticallyAppendUserMessage(
        queryClient,
        newConversationId,
        content
      );

      // Route transition happens only after optimistic cache update to avoid blank initial render.
      router.push(`/chat/${newConversationId}`);

      setProcessingState({
        isProcessing: true,
        status: 'AI is thinking...',
      });

      try {
        // Send the first message to the new conversation
        // We need to use the conversations API directly since we don't have
        // the mutation hook set up for this conversation yet
        const { conversationsApi } = await import('@/lib/api/conversations');
        await conversationsApi.sendMessage(newConversationId, { content });
      } catch (error) {
        setProcessingState({
          isProcessing: false,
          status: '',
        });
        rollback();
        toast.error('Failed to send message', {
          description: 'Please try again.',
        });
        throw error;
      }
    },
    [onCreateConversation, queryClient, router, selectedTechnique]
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
        setProcessingState({
          isProcessing: true,
          status: 'AI is thinking...',
        });
        await sendMessage({ content });
      } catch (error) {
        setProcessingState({
          isProcessing: false,
          status: '',
        });
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

  // Show loading state only when conversation data is not yet available.
  if (conversationId && !conversation && (isLoading || showLoading)) {
    return <ConversationLoading isExiting={isLoadingExiting} />;
  }

  // Show empty state if no conversation is selected
  if (!conversationId) {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-transparent">
        <ChatHeader conversation={null} onMobileMenuToggle={onMobileMenuToggle} />
        <EmptyState
          className="pt-14 md:pt-16"
          isCreating={isCreating}
          isTransitioning={isTransitioning}
          onSendMessage={handleSendFirstMessage}
          onTechniqueChange={onTechniqueChange}
          selectedTechnique={selectedTechnique}
        />
      </div>
    );
  }

  // Show error state if conversation failed to load
  if (conversationError && conversationId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <ErrorState error={conversationError} onRetry={() => window.location.reload()} showRetry />
      </div>
    );
  }

  // Fallback while mounting an existing conversation route with no cached detail yet.
  if (!conversation) {
    return <ConversationLoading isExiting={false} />;
  }

  const latestMessage = conversation.recentMessages[conversation.recentMessages.length - 1];
  const shouldShowDerivedProcessing =
    !processingState.isProcessing &&
    !rateLimitInfo &&
    !streamError &&
    latestMessage?.role === 'user';
  const effectiveProcessingState = shouldShowDerivedProcessing
    ? {
        isProcessing: true,
        status: 'AI is thinking...',
      }
    : processingState;

  // Show active conversation state
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-transparent">
      {/* Floating chat header */}
      <ChatHeader conversation={conversation} onMobileMenuToggle={onMobileMenuToggle} />

      {/* Rate limit banner */}
      {rateLimitInfo && (
        <div className="relative z-0 mt-16 border-b border-japandi-sand/60 bg-japandi-cream/60 p-4">
          <RateLimitBanner
            onDismiss={handleDismissRateLimit}
            retryAfter={rateLimitInfo.retryAfter}
          />
        </div>
      )}

      {/* Streaming error banner */}
      {streamError && streamError.type !== 'rate_limit' && (
        <div className="border-b border-red-500/25 bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-200">Connection Error</p>
              <p className="text-sm text-japandi-stone/75">{streamError.message}</p>
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
        <div className="border-b border-japandi-sand/60 bg-japandi-light-stone/45 px-4 py-2">
          <p className="text-xs text-japandi-stone/60">Connecting to real-time updates...</p>
        </div>
      )}

      {/* Message list */}
      <MessageList
        conversationId={conversationId}
        hasArchivedMessages={conversation.hasArchivedMessages}
        processingState={effectiveProcessingState}
        recentMessages={conversation.recentMessages}
      />

      {/* Send error banner (shown above input) */}
      {sendError && (
        <div className="border-t border-red-500/25 bg-red-500/10 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
            <p className="text-sm text-red-700 dark:text-red-200">
              Failed to send message. Please try again.
            </p>
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

function ConversationLoading({ isExiting }: { isExiting: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLSpanElement[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // Entrance + looping animation
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { duration: 0.25, ease: 'power2.out', opacity: 1 }
      );

      if (glowRef.current && !prefersReducedMotion) {
        gsap.to(glowRef.current, {
          duration: 1.8,
          ease: 'sine.inOut',
          opacity: 0.7,
          repeat: -1,
          scale: 1.15,
          yoyo: true,
        });
      }

      // Staggered dots (subtle "loading")
      gsap.fromTo(
        dotsRef.current,
        { opacity: 0.25, y: 0 },
        {
          duration: prefersReducedMotion ? 0 : 0.6,
          ease: 'sine.inOut',
          opacity: 0.8,
          repeat: prefersReducedMotion ? 0 : -1,
          stagger: 0.12,
          y: -6,
          yoyo: !prefersReducedMotion,
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  // Exit animation
  useEffect(() => {
    if (!isExiting || !containerRef.current) {
      return;
    }

    gsap.to(containerRef.current, {
      duration: 0.22,
      ease: 'power2.in',
      opacity: 0,
    });
  }, [isExiting]);

  return (
    <div
      className="relative flex h-full items-center justify-center overflow-hidden"
      ref={containerRef}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
      >
        <div
          className="h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(196,120,91,0.2),rgba(139,158,130,0.14),transparent_65%)] blur-[105px] opacity-60"
          ref={glowRef}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <p className="text-sm text-japandi-stone/65">Opening conversation</p>
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              className="h-1.5 w-1.5 rounded-full bg-japandi-timber/65"
              key={i}
              ref={(el) => {
                if (el) {
                  dotsRef.current[i] = el;
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
