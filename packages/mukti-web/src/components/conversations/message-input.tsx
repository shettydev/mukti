/**
 * MessageInput component for composing and sending messages
 * Features auto-resize textarea, keyboard shortcuts, and validation
 */

'use client';

import { ArrowUp, Loader2 } from 'lucide-react';
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
    <div className="sticky bottom-0 z-10 border-t border-japandi-sand/70 bg-japandi-cream/88 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur md:px-4">
      {/* Technique indicator */}
      {technique && (
        <div className="mb-2 flex items-center justify-between">
          <TechniqueIndicator technique={technique} />
        </div>
      )}

      <div className="relative">
        <textarea
          aria-describedby="character-count"
          aria-label="Message input"
          className={cn(
            'min-h-[56px] max-h-[200px] w-full resize-none rounded-2xl border border-japandi-sand/80 bg-japandi-light-stone/45 px-4 py-3.5 pr-14',
            'text-base text-japandi-stone placeholder:text-japandi-stone/45',
            'focus:outline-none focus:ring-2 focus:ring-japandi-sage/35',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'shadow-sm',
            isOverLimit && 'focus:ring-destructive'
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
          aria-label="Send message"
          className="absolute bottom-2 right-2 h-10 min-h-[44px] w-10 min-w-[44px] rounded-full bg-japandi-terracotta text-white hover:bg-japandi-timber focus-visible:ring-japandi-sage/50"
          data-testid="send-button"
          disabled={!canSend || isOverLimit}
          onClick={handleSend}
          size="icon"
          type="button"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </Button>
      </div>

      <div
        className={cn(
          'mt-2 flex items-center justify-end text-xs',
          isOverLimit
            ? 'text-destructive'
            : isNearLimit
              ? 'text-yellow-600 dark:text-yellow-500'
              : 'text-japandi-stone/60'
        )}
        data-testid="character-count"
        id="character-count"
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
