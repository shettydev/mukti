/**
 * ConversationDetail component for displaying conversation with messages
 * Includes header with actions, message list, message input, and error/loading states
 *
 * Features:
 * - Responsive design (optimized for mobile and desktop)
 * - Accessible navigation with ARIA labels
 * - Touch-friendly targets (44x44px minimum)
 * - Message sending with optimistic updates
 * - Rate limit handling with banner
 *
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArrowLeft, MoreVertical, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ModelSelector } from '@/components/ai/model-selector';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversationStream } from '@/lib/hooks/use-conversation-stream';
import {
  useConversation,
  useDeleteConversation,
  useSendMessage,
  useUpdateConversation,
} from '@/lib/hooks/use-conversations';
import { conversationKeys } from '@/lib/query-keys';
import { useAiStore } from '@/lib/stores/ai-store';
import { getRetryAfter, isRateLimitError } from '@/lib/utils/error-types';

import { MessageInput } from './message-input';
import { MessageList } from './message-list';
import { RateLimitBanner } from './rate-limit-banner';

interface ConversationDetailProps {
  conversationId: string;
}

export function ConversationDetail({ conversationId }: ConversationDetailProps) {
  const queryClient = useQueryClient();
  const { data: conversation, error, isLoading } = useConversation(conversationId);
  const { mutate: updateConversation } = useUpdateConversation(conversationId);
  const { isPending: isDeleting, mutate: deleteConversation } = useDeleteConversation();
  const { isPending: isSending, mutateAsync: sendMessage } = useSendMessage(conversationId);

  const {
    activeModel,
    hydrate: hydrateAi,
    isHydrated: aiHydrated,
    models,
    setActiveModel,
  } = useAiStore();

  useEffect(() => {
    if (!aiHydrated) {
      hydrateAi();
    }
  }, [aiHydrated, hydrateAi]);

  // Rate limit state
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<null | number>(null);

  // Processing state for loading indicators
  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean;
    queuePosition?: number;
    status: string;
  }>({
    isProcessing: false,
    status: '',
  });

  // SSE error state (separate from query error)
  const [sseError, setSseError] = useState<null | string>(null);
  const [showManualRefresh, setShowManualRefresh] = useState(false);

  // Establish SSE connection for real-time updates
  const { isConnected } = useConversationStream({
    conversationId,
    enabled: !!conversation && !conversation.isArchived, // Only connect if conversation exists and not archived
    onComplete: (_event) => {
      // Clear loading state when processing completes
      setProcessingState({
        isProcessing: false,
        status: '',
      });
      setSseError(null);
      setShowManualRefresh(false);
    },
    onError: (err) => {
      // Handle SSE connection errors
      // Don't show errors for authentication/authorization issues (handled by auth system)
      if (err.type !== 'authentication' && err.type !== 'authorization') {
        setSseError(err.message);
        // Show manual refresh option if connection fails
        setShowManualRefresh(true);
      }
    },
    onErrorEvent: (event) => {
      // Handle error events from the server
      setSseError(event.data.message);
      setProcessingState({
        isProcessing: false,
        status: '',
      });
      // Show manual refresh option on error
      setShowManualRefresh(true);
    },
    onProcessing: (event) => {
      // Set loading state when processing starts
      setProcessingState({
        isProcessing: true,
        queuePosition: event.data.position,
        status: 'AI is thinking...',
      });
      setSseError(null);
      setShowManualRefresh(false);
    },
    onProgress: (event) => {
      // Update status and queue position during processing
      setProcessingState((prev) => ({
        ...prev,
        queuePosition: event.data.position,
        status: event.data.status,
      }));
    },
    onRateLimit: (retryAfter) => {
      // Handle rate limit from SSE connection
      setRateLimitRetryAfter(retryAfter || 60);
    },
  });

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage({ content, model: activeModel ?? undefined });
      } catch (err) {
        // Check if it's a rate limit error
        if (isRateLimitError(err)) {
          const retryAfter = getRetryAfter(err);
          setRateLimitRetryAfter(retryAfter);
        }
        throw err; // Re-throw to let MessageInput handle the error state
      }
    },
    [sendMessage]
  );

  // Handle rate limit banner dismiss
  const handleRateLimitDismiss = useCallback(() => {
    setRateLimitRetryAfter(null);
  }, []);

  // Handle manual refresh when SSE fails
  const handleManualRefresh = useCallback(() => {
    // Invalidate the conversation query to trigger a refetch
    // This provides a fallback when SSE is not working
    queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
    setSseError(null);
    setShowManualRefresh(false);
  }, [conversationId, queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-20 w-full" key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const is404 = error.message.includes('not found') || error.message.includes('404');

    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">
            {is404 ? 'Conversation Not Found' : 'Error Loading Conversation'}
          </h2>
          <p className="text-muted-foreground">
            {is404
              ? "The conversation you're looking for doesn't exist or has been deleted."
              : 'Failed to load conversation. Please try again.'}
          </p>
          <Button asChild>
            <Link href="/dashboard/conversations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Conversations
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // No data state (shouldn't happen but handle it)
  if (!conversation) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Conversation Not Found</h2>
          <Button asChild>
            <Link href="/dashboard/conversations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Conversations
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleToggleFavorite = () => {
    updateConversation({ isFavorite: !conversation.isFavorite });
  };

  const handleToggleArchive = () => {
    updateConversation({ isArchived: !conversation.isArchived });
  };

  const handleDelete = () => {
    if (
      confirm('Are you sure you want to delete this conversation? This action cannot be undone.')
    ) {
      deleteConversation(conversationId);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header - responsive padding and layout */}
      <header className="shrink-0 border-b bg-background p-3 md:p-4" role="banner">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Back button with touch-friendly size */}
          <Button
            asChild
            className="min-h-[44px] min-w-[44px] shrink-0"
            size="icon"
            variant="ghost"
          >
            <Link href="/dashboard/conversations">
              <ArrowLeft aria-hidden="true" className="h-5 w-5" />
              <span className="sr-only">Back to conversations</span>
            </Link>
          </Button>

          {/* Title and metadata - responsive text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg md:text-xl font-semibold">{conversation.title}</h1>
              {/* Connection status indicator (optional) */}
              {isConnected && (
                <div
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  title="Real-time updates active"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  <span className="hidden sm:inline">Live</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground flex-wrap">
              <span className="capitalize">{conversation.technique}</span>
              <span aria-hidden="true">•</span>
              <span>{conversation.metadata.messageCount} messages</span>
              {conversation.tags.length > 0 && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">
                    •
                  </span>
                  <span className="hidden sm:inline">{conversation.tags.join(', ')}</span>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:block w-72">
            <ModelSelector
              className="w-full"
              disabled={models.length === 0}
              models={models}
              onChange={(modelId) => {
                setActiveModel(modelId);
              }}
              value={activeModel}
            />
          </div>

          {/* Action buttons with touch-friendly sizes */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button
              aria-label={conversation.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-pressed={conversation.isFavorite}
              className="min-h-[44px] min-w-[44px]"
              onClick={handleToggleFavorite}
              size="icon"
              variant="ghost"
            >
              <Star
                aria-hidden="true"
                className={`h-5 w-5 ${conversation.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="More options"
                  className="min-h-[44px] min-w-[44px]"
                  size="icon"
                  variant="ghost"
                >
                  <MoreVertical aria-hidden="true" className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="min-h-[44px]" onClick={handleToggleArchive}>
                  <Archive aria-hidden="true" className="mr-2 h-4 w-4" />
                  {conversation.isArchived ? 'Unarchive' : 'Archive'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive min-h-[44px]"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages - main content area */}
      <MessageList
        conversationId={conversationId}
        hasArchivedMessages={conversation.hasArchivedMessages}
        processingState={processingState}
        recentMessages={conversation.recentMessages}
      />

      {/* SSE Error Banner */}
      {sseError && (
        <div className="px-4 pb-2">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Connection Error</p>
                <p className="text-sm text-destructive/90">{sseError}</p>
                {showManualRefresh && (
                  <p className="mt-2 text-xs text-destructive/80">
                    Real-time updates are unavailable. You can manually refresh to check for new
                    messages.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {showManualRefresh && (
                  <Button
                    className="h-auto px-2 py-1 text-xs text-destructive hover:text-destructive"
                    onClick={handleManualRefresh}
                    size="sm"
                    variant="ghost"
                  >
                    Refresh
                  </Button>
                )}
                <Button
                  className="h-auto p-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    setSseError(null);
                    setShowManualRefresh(false);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <span className="sr-only">Dismiss</span>
                  <span aria-hidden="true">×</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limit Banner */}
      {rateLimitRetryAfter !== null && (
        <div className="px-4 pb-2">
          <RateLimitBanner onDismiss={handleRateLimitDismiss} retryAfter={rateLimitRetryAfter} />
        </div>
      )}

      {/* Message Input */}
      <MessageInput
        conversationId={conversationId}
        disabled={isSending || rateLimitRetryAfter !== null || conversation.isArchived}
        onSend={handleSendMessage}
      />
    </div>
  );
}
