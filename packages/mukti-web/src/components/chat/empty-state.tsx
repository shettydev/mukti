'use client';

/**
 * EmptyState component for Quick Chat Interface
 *
 * Displays a centered input layout when no conversation is active.
 * Features:
 * - Centered vertically and horizontally
 * - Quirky heading that rotates randomly
 * - Technique selector above input
 * - Clean, distraction-free interface
 * - Error handling with retry functionality
 *
 */

import { AlertCircle, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { TechniqueSelector } from '@/components/conversations/technique-selector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  error?: Error | null;
  isCreating?: boolean;
  isTransitioning?: boolean;
  onRetry?: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onTechniqueChange: (technique: SocraticTechnique) => void;
  selectedTechnique: SocraticTechnique;
}

/**
 * Quirky headings reflecting Socratic philosophy
 * Randomly selected on component mount
 */
const QUIRKY_HEADINGS = [
  "What's puzzling you today?",
  'Question everything.',
  "Let's think together...",
  'What would Socrates ask?',
  'Ready to challenge your assumptions?',
  'Seek wisdom through inquiry.',
  'The unexamined life is not worth living.',
  'Know thyself.',
] as const;

/**
 * EmptyState component
 *
 * Displays centered input with quirky heading when no conversation is active.
 * Includes technique selector and message input.
 */
export function EmptyState({
  className,
  error = null,
  isCreating = false,
  isTransitioning = false,
  onRetry,
  onSendMessage,
  onTechniqueChange,
  selectedTechnique,
}: EmptyStateProps) {
  const [heading, setHeading] = useState<string>('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set random heading on mount
  useEffect(() => {
    setHeading(getRandomHeading());
  }, []);

  const isValid = content.trim().length > 0;
  const canSend = isValid && !isCreating && !isSending;

  /**
   * Auto-resize textarea based on content
   */
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
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
    if (!canSend) {
      return;
    }

    const trimmedContent = content.trim();
    setIsSending(true);

    try {
      await onSendMessage(trimmedContent);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      // Keep content on error for retry
    } finally {
      setIsSending(false);
    }
  }, [canSend, content, onSendMessage]);

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

  return (
    <section
      aria-label="Start new conversation"
      className={cn(
        'flex flex-1 items-center justify-center px-4 py-6 sm:p-4',
        'animate-fade-in-up',
        'transition-all duration-300 ease-out',
        isTransitioning && 'opacity-0 scale-95 translate-y-4',
        className
      )}
    >
      <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
        {/* Quirky heading */}
        <h1 className="text-center text-2xl font-bold text-foreground sm:text-3xl md:text-4xl px-2 animate-fade-in animation-delay-200">
          {heading}
        </h1>

        {/* Technique selector */}
        <div className="space-y-2 px-2 sm:px-0">
          <label
            className="block text-center text-xs sm:text-sm font-medium text-muted-foreground"
            htmlFor="technique-selector"
          >
            Choose your inquiry method
          </label>
          <TechniqueSelector
            disabled={isCreating || isSending}
            onChange={onTechniqueChange}
            value={selectedTechnique}
          />
        </div>

        {/* Loading indicator for conversation creation */}
        {isCreating && (
          <div
            aria-live="polite"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground px-2"
            role="status"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Creating conversation...</span>
          </div>
        )}

        {/* Error banner for conversation creation failure */}
        {error && (
          <div
            aria-live="assertive"
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 mx-2 sm:mx-0"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Failed to create conversation
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
                {onRetry && (
                  <Button
                    aria-label="Retry creating conversation"
                    className="transition-all duration-200 hover:scale-105 active:scale-95"
                    onClick={onRetry}
                    size="sm"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Message input */}
        <div className="relative px-2 sm:px-0">
          <textarea
            aria-describedby="input-helper-text"
            aria-label="Type your first message to start a conversation"
            className={cn(
              'w-full resize-none rounded-lg border bg-background px-3 py-3 pr-12 sm:px-4 sm:pr-14',
              'text-sm placeholder:text-muted-foreground',
              'transition-all duration-200',
              'hover:border-primary/50',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border',
              'min-h-[56px] max-h-[160px] sm:max-h-[200px]'
            )}
            disabled={isCreating || isSending}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            ref={textareaRef}
            value={content}
          />

          <Button
            aria-label={
              isCreating || isSending
                ? 'Sending message'
                : canSend
                  ? 'Send message'
                  : 'Type a message to enable send button'
            }
            className={cn(
              'absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 h-10 w-10 sm:h-11 sm:w-11 min-h-[44px] min-w-[44px]',
              'transition-all duration-200',
              canSend && 'hover:scale-105 active:scale-95'
            )}
            disabled={!canSend}
            onClick={handleSend}
            size="icon"
            type="button"
          >
            {isCreating || isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Helper text */}
        <p
          className="text-center text-[10px] sm:text-xs text-muted-foreground px-2"
          id="input-helper-text"
        >
          Start your journey of inquiry. Press Enter to send, Shift+Enter for a new line.
        </p>
      </div>
    </section>
  );
}

/**
 * Selects a random heading from the available options
 */
function getRandomHeading(): string {
  const randomIndex = Math.floor(Math.random() * QUIRKY_HEADINGS.length);
  return QUIRKY_HEADINGS[randomIndex];
}
