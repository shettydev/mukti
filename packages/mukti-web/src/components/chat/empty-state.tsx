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
 *
 */

import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { TechniqueSelector } from '@/components/conversations/technique-selector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  isCreating?: boolean;
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
  isCreating = false,
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
    <div className={cn('flex min-h-screen items-center justify-center p-4', className)}>
      <div className="w-full max-w-2xl space-y-6">
        {/* Quirky heading */}
        <h1 className="text-center text-3xl font-bold text-foreground sm:text-4xl">{heading}</h1>

        {/* Technique selector */}
        <div className="space-y-2">
          <label
            className="block text-center text-sm font-medium text-muted-foreground"
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

        {/* Message input */}
        <div className="relative">
          <textarea
            aria-label="Message input"
            className={cn(
              'w-full resize-none rounded-lg border bg-background px-4 py-3 pr-14',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[56px] max-h-[200px]'
            )}
            disabled={isCreating || isSending}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
            ref={textareaRef}
            value={content}
          />

          <Button
            aria-label="Send message"
            className="absolute bottom-3 right-3 h-11 w-11"
            disabled={!canSend}
            onClick={handleSend}
            size="icon"
            type="button"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-muted-foreground">
          Start your journey of inquiry. Press Enter to send, Shift+Enter for a new line.
        </p>
      </div>
    </div>
  );
}

/**
 * Selects a random heading from the available options
 */
function getRandomHeading(): string {
  const randomIndex = Math.floor(Math.random() * QUIRKY_HEADINGS.length);
  return QUIRKY_HEADINGS[randomIndex];
}
