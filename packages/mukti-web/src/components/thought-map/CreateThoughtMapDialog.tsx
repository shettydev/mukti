'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Network } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ThinkingIntent } from '@/types/thought-map';
import type { ThoughtMap } from '@/types/thought-map';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateThoughtMap } from '@/lib/hooks/use-thought-map';
import { useThoughtMapStore } from '@/lib/stores/thought-map-store';

import { ThinkingIntentSelector } from './ThinkingIntentSelector';
import {
  MAX_TITLE_LENGTH,
  PLACEHOLDER_CYCLE_MS,
  PROMPT_CYCLE_MS,
  SOCRATIC_PROMPTS,
  THINKING_INTENTS,
} from './thought-map-constants';

// ============================================================================
// Constants (dialog-specific)
// ============================================================================

const NODE_PREVIEW_MIN_CHARS = 3;
const NODE_PREVIEW_MAX_CHARS = 40;

// ============================================================================
// Types
// ============================================================================

interface CreateThoughtMapDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: (map: ThoughtMap) => void;
  open: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

export function CreateThoughtMapDialog({
  onOpenChange,
  onSuccess,
  open,
}: CreateThoughtMapDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createMutation = useCreateThoughtMap();
  const setThinkingIntent = useThoughtMapStore((state) => state.setThinkingIntent);

  const [error, setError] = useState<null | string>(null);
  const [title, setTitle] = useState('');
  const [intent, setIntent] = useState<ThinkingIntent>('explore');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const activeIntentMeta = useMemo(
    () => THINKING_INTENTS.find((i) => i.value === intent)!,
    [intent]
  );

  const activePlaceholder =
    activeIntentMeta.placeholders[placeholderIndex % activeIntentMeta.placeholders.length];

  // Cycle placeholder text when user hasn't typed anything
  useEffect(() => {
    if (title.length > 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setPlaceholderIndex((prev) => prev + 1);
    }, PLACEHOLDER_CYCLE_MS);

    return () => window.clearInterval(interval);
  }, [title.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setTitle('');
    setIntent('explore');
    setPlaceholderIndex(0);

    const timer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (createMutation.isPending) {
        return;
      }
      onOpenChange(nextOpen);
    },
    [createMutation.isPending, onOpenChange]
  );

  const handleIntentChange = useCallback((newIntent: ThinkingIntent) => {
    setIntent(newIntent);
    setPlaceholderIndex(0);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        setError('Please enter a starting thought.');
        return;
      }

      setError(null);

      try {
        setThinkingIntent(intent);
        const map = await createMutation.mutateAsync({ title: trimmedTitle });
        onOpenChange(false);
        onSuccess?.(map);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'Failed to create Thought Map. Please try again.'
        );
      }
    },
    [createMutation, intent, onOpenChange, onSuccess, setThinkingIntent, title]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            New Thought Map
          </DialogTitle>
          <SocraticPromptCycler />
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <ThinkingIntentSelector onChange={handleIntentChange} value={intent} />

          <div className="space-y-2">
            <Label htmlFor="thought-map-title">
              Your starting thought
              <span className="ml-1 text-stone-400 dark:text-stone-500">
                ({title.length}/{MAX_TITLE_LENGTH})
              </span>
            </Label>
            <Textarea
              autoComplete="off"
              disabled={createMutation.isPending}
              id="thought-map-title"
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => {
                setTitle(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder={activePlaceholder}
              ref={textareaRef}
              rows={2}
              value={title}
            />
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          </div>

          <AnimatePresence>
            {title.trim().length >= NODE_PREVIEW_MIN_CHARS && (
              <TopicNodePreview text={title.trim()} />
            )}
          </AnimatePresence>

          <DialogFooter>
            <Button
              disabled={createMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createMutation.isPending || !title.trim()} type="submit">
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Begin Thinking'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SocraticPromptCycler() {
  const [index, setIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SOCRATIC_PROMPTS.length);
    }, PROMPT_CYCLE_MS);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <p className="text-sm text-muted-foreground">{SOCRATIC_PROMPTS[0]}</p>;
  }

  return (
    <div className="relative h-5">
      <AnimatePresence mode="wait">
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-0 text-sm text-muted-foreground"
          exit={{ opacity: 0, y: -4 }}
          initial={{ opacity: 0, y: 4 }}
          key={index}
          transition={{ duration: 0.3 }}
        >
          {SOCRATIC_PROMPTS[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function TopicNodePreview({ text }: { text: string }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const truncated =
    text.length > NODE_PREVIEW_MAX_CHARS ? text.slice(0, NODE_PREVIEW_MAX_CHARS) + '...' : text;

  const content = (
    <div className="flex flex-col items-center gap-3 py-2">
      {/* Mini topic node */}
      <div className="relative">
        <div
          className="rounded-xl border-2 border-stone-600 bg-gradient-to-br
            from-stone-800 to-stone-900 px-4 py-2.5 shadow-lg shadow-stone-900/30"
        >
          <p className="max-w-[200px] truncate text-center text-xs font-semibold text-stone-50">
            {truncated}
          </p>
        </div>

        {/* Radiating branch hints */}
        <svg
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-stone-400 dark:text-stone-500"
          height="20"
          viewBox="0 0 80 20"
          width="80"
        >
          {/* Left branch */}
          <line
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeWidth="1.5"
            x1="40"
            x2="12"
            y1="0"
            y2="16"
          />
          <circle cx="12" cy="16" fill="currentColor" r="2.5" />

          {/* Center branch */}
          <line
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeWidth="1.5"
            x1="40"
            x2="40"
            y1="0"
            y2="16"
          />
          <circle cx="40" cy="16" fill="currentColor" r="2.5" />

          {/* Right branch */}
          <line
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeWidth="1.5"
            x1="40"
            x2="68"
            y1="0"
            y2="16"
          />
          <circle cx="68" cy="16" fill="currentColor" r="2.5" />
        </svg>
      </div>
    </div>
  );

  if (prefersReducedMotion) {
    return content;
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
    >
      {content}
    </motion.div>
  );
}
