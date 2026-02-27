'use client';

/**
 * ChatMessage component
 *
 * Displays a single message in the node dialogue chat panel.
 * Styles differently for user vs AI assistant messages.
 *
 * @requirements 4.2 - Dialogue history display with timestamps
 */

import { Bot, User } from 'lucide-react';

import type { DialogueMessage } from '@/types/dialogue.types';

import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ChatMessage component
 * @property message - The dialogue message to display
 */
export interface ChatMessageProps {
  message: DialogueMessage;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ChatMessage - Displays a single message in the dialogue
 *
 * Features:
 * - Role indicator (user/assistant) with icon
 * - Timestamp display
 * - Different styling for user vs AI messages
 * - Markdown rendering for AI responses
 *
 * @example
 * ```tsx
 * <ChatMessage
 *   message={{
 *     id: '1',
 *     dialogueId: 'dialogue-1',
 *     role: 'user',
 *     content: 'I think this assumption is valid because...',
 *     sequence: 1,
 *     timestamp: '2024-01-01T12:00:00Z'
 *   }}
 * />
 * ```
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-3 py-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Role indicator icon */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message content */}
      <div className={cn('flex max-w-[85%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        {/* Role label */}
        <span className="text-xs font-medium text-muted-foreground">
          {isUser ? 'You' : 'Socratic Mentor'}
        </span>

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-3 py-2',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
          ) : (
            <Markdown className="text-[0.94rem] leading-6">{message.content}</Markdown>
          )}
        </div>

        {/* Timestamp */}
        <time className="text-xs text-muted-foreground" dateTime={message.timestamp}>
          {formatTimestamp(message.timestamp)}
        </time>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Formats a timestamp for display
 * Shows time for today, date and time for older messages
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}
