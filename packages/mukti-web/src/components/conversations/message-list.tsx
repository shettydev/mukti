/**
 * MessageList component for displaying conversation messages
 * with chronological ordering, archived message loading, and smart auto-scroll behavior
 *
 * Features:
 * - Auto-scroll to bottom when user is at bottom and new messages arrive
 * - Preserve scroll position when user is reading old messages
 * - "Scroll to bottom" button when scrolled up with new messages
 * - Smooth scrolling animations
 * - Batched scroll updates for rapid messages
 */

'use client';

import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Message as MessageType } from '@/types/conversation.types';

import { Button } from '@/components/ui/button';
import { useArchivedMessages } from '@/lib/hooks/use-conversations';

import { LoadOlderButton } from './load-older-button';
import { LoadingMessage } from './loading-message';
import { Message } from './message';

interface MessageListProps {
  conversationId: string;
  hasArchivedMessages: boolean;
  processingState?: {
    isProcessing: boolean;
    status: string;
  };
  recentMessages: MessageType[];
}

// Threshold for considering user "at bottom" (in pixels)
const SCROLL_THRESHOLD = 100;

export function MessageList({
  conversationId,
  hasArchivedMessages,
  processingState,
  recentMessages,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousMessageCountRef = useRef(recentMessages.length);

  // Track processing duration for LoadingMessage
  const [processingDuration, setProcessingDuration] = useState(0);
  const processingStartTimeRef = useRef<null | number>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data: archivedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useArchivedMessages(conversationId);

  // Flatten archived messages from all pages
  const archivedMessages = archivedData?.pages.flatMap((page) => page) ?? [];

  // Combine archived and recent messages, sorted by sequence
  const allMessages = [...archivedMessages, ...recentMessages].sort(
    (a, b) => a.sequence - b.sequence
  );

  /**
   * Check if user is scrolled to bottom of message list
   */
  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return false;
    }

    const { clientHeight, scrollHeight, scrollTop } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  /**
   * Scroll to bottom with smooth animation
   */
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setHasNewMessages(false);
    setShowScrollButton(false);
  }, []);

  /**
   * Handle scroll events to detect user position
   */
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);

    // Show scroll button if user scrolled up and there are new messages
    if (!atBottom && hasNewMessages) {
      setShowScrollButton(true);
    } else if (atBottom) {
      setShowScrollButton(false);
      setHasNewMessages(false);
    }
  }, [checkIfAtBottom, hasNewMessages]);

  /**
   * Auto-scroll to bottom when new messages arrive (if user is at bottom)
   * Batch scroll updates to avoid jank with rapid messages
   */
  useEffect(() => {
    const messageCount = recentMessages.length;
    const hasNewMessage = messageCount > previousMessageCountRef.current;

    if (hasNewMessage) {
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Batch scroll updates with a small delay
      scrollTimeoutRef.current = setTimeout(() => {
        if (isAtBottom) {
          // User is at bottom, auto-scroll to show new message
          scrollToBottom('smooth');
        } else {
          // User is scrolled up, mark that there are new messages
          setHasNewMessages(true);
          setShowScrollButton(true);
        }
      }, 100); // 100ms batching window

      previousMessageCountRef.current = messageCount;
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [recentMessages.length, isAtBottom, scrollToBottom]);

  /**
   * Initial scroll to bottom when component mounts
   */
  useEffect(() => {
    // Use instant scroll on mount
    scrollToBottom('instant');
  }, [scrollToBottom]);

  /**
   * Track processing duration for LoadingMessage status updates
   */
  useEffect(() => {
    if (processingState?.isProcessing) {
      // Start tracking duration when processing begins
      if (!processingStartTimeRef.current) {
        processingStartTimeRef.current = Date.now();
        setProcessingDuration(0);
      }

      // Update duration every second
      durationIntervalRef.current = setInterval(() => {
        if (processingStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - processingStartTimeRef.current) / 1000);
          setProcessingDuration(elapsed);
        }
      }, 1000);
    } else {
      // Clear duration tracking when processing completes
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      processingStartTimeRef.current = null;
      setProcessingDuration(0);
    }

    // Cleanup on unmount
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [processingState?.isProcessing]);

  /**
   * Update scroll position check when archived messages are loaded
   */
  useEffect(() => {
    // When archived messages are loaded, maintain scroll position
    // (browser handles this automatically, but we need to update our state)
    handleScroll();
  }, [archivedMessages.length, handleScroll]);

  if (allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-japandi-stone/65">No messages yet. Start the conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        aria-label="Conversation messages"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={handleScroll}
        ref={scrollContainerRef}
        role="log"
      >
        {hasArchivedMessages && (
          <LoadOlderButton
            hasMore={hasNextPage ?? false}
            isLoading={isFetchingNextPage}
            onLoad={() => fetchNextPage()}
          />
        )}

        <div className="space-y-1 px-3 pb-4 pt-16 md:px-5 md:pt-[4.5rem]">
          {allMessages.map((message) => (
            <Message key={`${message.sequence}-${message.timestamp}`} message={message} />
          ))}

          {/* Loading indicator when AI is processing */}
          {processingState?.isProcessing && (
            <LoadingMessage duration={processingDuration} status={processingState.status} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Button
            aria-label={hasNewMessages ? 'New messages' : 'Scroll to bottom'}
            className="border border-japandi-sand/80 bg-japandi-cream text-japandi-stone shadow-md hover:bg-japandi-light-stone/75"
            onClick={() => scrollToBottom('smooth')}
            size="sm"
            variant="outline"
          >
            <ArrowDown aria-hidden="true" className="mr-2 h-4 w-4" />
            {hasNewMessages ? 'New messages' : 'Scroll to bottom'}
          </Button>
        </div>
      )}
    </div>
  );
}
