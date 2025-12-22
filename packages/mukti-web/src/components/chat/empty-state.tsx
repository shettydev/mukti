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

import { gsap } from 'gsap';
import { ArrowUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { TechniqueSelector } from '@/components/conversations/technique-selector';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  isCreating?: boolean;
  isTransitioning?: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onTechniqueChange: (technique: SocraticTechnique) => void;
  selectedTechnique: SocraticTechnique;
}

/**
 * Quirky headings reflecting Socratic philosophy
 * Randomly selected on component mount
 */
const QUIRKY_HEADINGS = [
  'The unexamined life is not worth living.',
  'Know thyself.',
  'Wonder is the beginning of wisdom.',
  'I cannot teach anybody anything. I can only make them think.',
  'Speak so that I may see you.',
  'To know, is to know that you know nothing.',
  'To find yourself, think for yourself.',
] as const;

/**
 * EmptyState component
 *
 * Displays centered input with fixed heading when no conversation is active.
 * Includes technique selector and message input.
 */
export function EmptyState({
  className,
  isCreating = false,
  isTransitioning = false,
  onSendMessage,
  onTechniqueChange,
  selectedTechnique,
}: EmptyStateProps) {
  const [heading, setHeading] = useState<string>('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Initialize GSAP Animations
  useEffect(() => {
    if (!containerRef.current || !glowRef.current) {
      return;
    }

    const glow = glowRef.current;
    const title = titleRef.current;

    const ctx = gsap.context(() => {
      // 1. Deep Void Breathing
      gsap.to(glow, {
        duration: 8,
        ease: 'sine.inOut',
        opacity: 0.4,
        repeat: -1,
        scale: 1.2,
        yoyo: true,
      });

      // 2. Title Entrance (Slide Up + Fade In)
      if (title) {
        gsap.fromTo(
          title,
          { opacity: 0, y: 20 },
          { duration: 1.5, ease: 'power3.out', opacity: 1, y: 0 }
        );
      }
    }, containerRef);

    // Mouse Follow Interaction
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      const { height, left, top, width } = containerRef.current.getBoundingClientRect();

      // Calculate mouse position relative to center (-1 to 1)
      const x = ((e.clientX - left) / width - 0.5) * 2;
      const y = ((e.clientY - top) / height - 0.5) * 2;

      // Move glow slightly towards mouse (parallax feel)
      gsap.to(glow, {
        duration: 1.5,
        ease: 'power2.out',
        overwrite: 'auto',
        rotation: x * 10,
        x: x * 80,
        y: y * 80,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      ctx.revert();
    };
  }, []);

  // Set heading on mount
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
    <div
      className={cn(
        'relative flex flex-1 items-center justify-center p-4 overflow-hidden',
        'transition-all duration-300 ease-out',
        isTransitioning && 'opacity-0 scale-95 translate-y-4',
        className
      )}
      ref={containerRef}
    >
      {/* Deep Void Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden"
      >
        <div
          className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-500/40 via-purple-500/40 to-blue-500/40 blur-[120px]"
          ref={glowRef}
        />
      </div>

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Quirky heading */}
        <h1
          className="text-center text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/20 sm:text-4xl pb-1"
          ref={titleRef}
        >
          {heading}
        </h1>

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
              'w-full resize-none rounded-2xl border-none bg-[#111111] px-4 py-4 pr-14',
              'text-base placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-white/10',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[56px] max-h-[200px]'
            )}
            disabled={isCreating || isSending}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            ref={textareaRef}
            value={content}
          />

          <Button
            aria-label="Send message"
            className="absolute bottom-6 right-2 h-10 w-10 rounded-full bg-white text-black hover:bg-white/90"
            disabled={!canSend}
            onClick={handleSend}
            size="icon"
            type="button"
          >
            <ArrowUp className="h-5 w-5" />
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
