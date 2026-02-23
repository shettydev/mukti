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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // Initialize ambient animations
  useEffect(() => {
    if (!containerRef.current || !glowRef.current) {
      return;
    }

    const glow = glowRef.current;
    const title = titleRef.current;

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        gsap.to(glow, {
          duration: 8,
          ease: 'sine.inOut',
          opacity: 0.45,
          repeat: -1,
          scale: 1.08,
          yoyo: true,
        });
      }

      if (title) {
        gsap.fromTo(
          title,
          { opacity: 0, y: 12 },
          { duration: 0.65, ease: 'power2.out', opacity: 1, y: 0 }
        );
      }
    }, containerRef);

    if (prefersReducedMotion) {
      return () => ctx.revert();
    }

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
        duration: 1.2,
        ease: 'power2.out',
        overwrite: 'auto',
        rotation: x * 5,
        x: x * 50,
        y: y * 50,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      ctx.revert();
    };
  }, [prefersReducedMotion]);

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
        'relative flex flex-1 items-center justify-center overflow-hidden p-4',
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
          className="h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(196,120,91,0.2),rgba(139,158,130,0.16),transparent_68%)] blur-[95px]"
          ref={glowRef}
        />
      </div>

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Quirky heading */}
        <h1
          className="text-japandi-heading pb-1 text-center text-2xl text-japandi-stone sm:text-4xl"
          ref={titleRef}
        >
          {heading}
        </h1>

        {/* Technique selector */}
        <div className="space-y-2">
          <label
            className="text-japandi-label block text-center text-japandi-stone/65"
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
              'min-h-[56px] max-h-[200px] w-full resize-none rounded-2xl border border-japandi-sand/75 bg-japandi-cream/75 px-4 py-4 pr-14',
              'text-base text-japandi-stone placeholder:text-japandi-stone/45',
              'focus:outline-none focus:ring-2 focus:ring-japandi-sage/35',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'shadow-sm'
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
            className="absolute bottom-6 right-2 h-10 w-10 rounded-full bg-japandi-terracotta text-white hover:bg-japandi-timber focus-visible:ring-japandi-sage/50"
            disabled={!canSend}
            onClick={handleSend}
            size="icon"
            type="button"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>

        {/* Helper text */}
        <p className="text-center text-xs text-japandi-stone/55">
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
