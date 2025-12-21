/**
 * MessageInput component for composing and sending messages
 * Features auto-resize textarea, keyboard shortcuts, and validation
 */

'use client';

import { Loader2, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { TechniqueIndicator } from './technique-indicator';

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
  maxLength?: number;
  onSend: (content: string) => Promise<void>;
  technique?: SocraticTechnique;
}

const DEFAULT_MAX_LENGTH = 4000;

export function MessageInput({
  conversationId: _conversationId,
  disabled = false,
  maxLength = DEFAULT_MAX_LENGTH,
  onSend,
  technique,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isValid = isValidMessage(content);
  const canSend = isValid && !disabled && !isSending;
  const characterCount = content.length;
  const isNearLimit = characterCount > maxLength * 0.9;
  const isOverLimit = characterCount > maxLength;

  /**
   * Auto-resize textarea based on content
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight, with min and max constraints
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Adjust height when content changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  /**
   * Handle sending message
   */
  const handleSend = useCallback(async () => {
    if (!canSend || isOverLimit) {
      return;
    }

    const trimmedContent = content.trim();
    setIsSending(true);

    try {
      await onSend(trimmedContent);
      // Clear input after successful send
      setContent('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      // Don't clear input on error - let user retry
    } finally {
      setIsSending(false);
      // Focus textarea after send - use setTimeout to ensure focus happens after state updates
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [canSend, content, isOverLimit, onSend]);

  /**
   * Handle keyboard shortcuts
   * Enter: Send message
   * Shift+Enter: Insert newline
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  /**
   * Handle content change
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  return (
    <div className="border-t bg-background p-3 sm:p-4">
      {/* Technique indicator */}
      {technique && (
        <div className="mb-2 flex items-center justify-between">
          <TechniqueIndicator technique={technique} />
        </div>
      )}

      {/* Loading indicator for sending message */}
      {isSending && (
        <div
          aria-live="polite"
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          <span>Sending message...</span>
        </div>
      )}

      <div className="relative">
        <textarea
          aria-describedby="character-count"
          aria-label="Type your message. Press Enter to send, Shift+Enter for new line"
          className={cn(
            'w-full resize-none rounded-lg border bg-background px-3 py-2.5 pr-12 sm:px-4 sm:py-3 sm:pr-14',
            'text-sm placeholder:text-muted-foreground',
            'transition-all duration-200',
            'hover:border-primary/50',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border',
            'min-h-[52px] sm:min-h-[56px] max-h-[160px] sm:max-h-[200px]',
            isOverLimit && 'border-destructive focus:ring-destructive hover:border-destructive'
          )}
          data-testid="message-input"
          disabled={disabled || isSending}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          ref={textareaRef}
          value={content}
        />

        <Button
          aria-label={
            isSending
              ? 'Sending message'
              : canSend
                ? 'Send message'
                : 'Type a message to enable send button'
          }
          className={cn(
            'absolute bottom-2 right-2 sm:bottom-3 sm:right-3 h-10 w-10 sm:h-11 sm:w-11 min-h-[44px] min-w-[44px]',
            'transition-all duration-200',
            canSend && !isOverLimit && 'hover:scale-105 active:scale-95'
          )}
          data-testid="send-button"
          disabled={!canSend || isOverLimit}
          onClick={handleSend}
          size="icon"
          type="button"
        >
          {isSending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Send aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div
        aria-live="polite"
        className={cn(
          'mt-1.5 sm:mt-2 flex items-center justify-end text-[10px] sm:text-xs',
          isOverLimit
            ? 'text-destructive'
            : isNearLimit
              ? 'text-yellow-600 dark:text-yellow-500'
              : 'text-muted-foreground'
        )}
        data-testid="character-count"
        id="character-count"
        role="status"
      >
        <span>
          {characterCount.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/**
 * Validates message content
 * Returns true if content is valid (non-empty after trimming)
 */
function isValidMessage(content: string): boolean {
  return content.trim().length > 0;
}
