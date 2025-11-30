/**
 * MessageList component for displaying conversation messages
 * with chronological ordering and archived message loading
 */

'use client';

import { useEffect, useRef } from 'react';

import type { Message as MessageType } from '@/types/conversation.types';

import { useArchivedMessages } from '@/lib/hooks/use-conversations';

import { LoadOlderButton } from './load-older-button';
import { Message } from './message';

interface MessageListProps {
  conversationId: string;
  hasArchivedMessages: boolean;
  recentMessages: MessageType[];
}

export function MessageList({
  conversationId,
  hasArchivedMessages,
  recentMessages,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentMessages.length]);

  if (allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            No messages yet. Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {hasArchivedMessages && (
        <LoadOlderButton
          hasMore={hasNextPage ?? false}
          isLoading={isFetchingNextPage}
          onLoad={() => fetchNextPage()}
        />
      )}

      <div className="space-y-1 px-4">
        {allMessages.map((message) => (
          <Message key={`${message.sequence}-${message.timestamp}`} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
