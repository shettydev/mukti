'use client';

/**
 * ChatInput component
 *
 * Textarea input with send button for the node dialogue chat panel.
 * Handles Enter to send, Shift+Enter for newline.
 *
 * @requirements 2.1 - User sends messages to AI
 */

import { Loader2, Send } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ChatInput component
 * @property disabled - Whether the input is disabled
 * @property isLoading - Whether a message is being sent
 * @property onSend - Callback when user sends a message
 * @property placeholder - Placeholder text for the textarea
 */
export interface ChatInputProps {
  disabled?: boolean;
  isLoading?: boolean;
  onSend: (content: string) => void;
  placeholder?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PLACEHOLDER = 'Share your thoughts...';
const MAX_MESSAGE_LENGTH = 5000;

// ============================================================================
// Component
// ============================================================================

/**
 * ChatInput - Message input for node dialogue
 *
 * Features:
 * - Textarea with auto-resize
 * - Enter to send, Shift+Enter for newline
 * - Send button with loading state
 * - Character limit validation
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={(content) => sendMessage({ content })}
 *   isLoading={isPending}
 *   placeholder="Explore this assumption..."
 * />
 * ```
 */
export function ChatInput({
  disabled = false,
  isLoading = false,
  onSend,
  placeholder = DEFAULT_PLACEHOLDER,
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = content.trim().length > 0 && !isLoading && !disabled;

  /**
   * Handle sending the message
   */
  const handleSend = useCallback(() => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isLoading || disabled) {
      return;
    }

    onSend(trimmedContent);
    setContent('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, isLoading, disabled, onSend]);

  /**
   * Handle keyboard events
   * Enter to send, Shift+Enter for newline
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
   * Handle content change with character limit
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setContent(value);
    }
  }, []);

  const remainingChars = MAX_MESSAGE_LENGTH - content.length;
  const showCharCount = content.length > MAX_MESSAGE_LENGTH * 0.8;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-end gap-2">
        <Textarea
          className={cn('min-h-[60px] max-h-[150px] resize-none pr-12', disabled && 'opacity-50')}
          disabled={disabled || isLoading}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          ref={textareaRef}
          rows={2}
          value={content}
        />

        <Button
          className="absolute bottom-2 right-2"
          disabled={!canSend}
          onClick={handleSend}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="sr-only">Send message</span>
        </Button>
      </div>

      {/* Character count indicator */}
      {showCharCount && (
        <div
          className={cn(
            'text-right text-xs',
            remainingChars < 100 ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {remainingChars} characters remaining
        </div>
      )}

      {/* Keyboard hint */}
      <div className="text-xs text-muted-foreground">
        Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Enter</kbd> to send,{' '}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Shift+Enter</kbd> for new
        line
      </div>
    </div>
  );
}
