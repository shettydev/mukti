'use client';

/**
 * EditableTopicNode — editable variant of TopicNode for the creation canvas.
 *
 * Mirrors TopicNode visually (gradient, border, handles, MapPin icon) but
 * renders a <textarea> instead of a static label. Used on the `/maps/new`
 * page so the user can type their starting thought directly into the canvas.
 *
 * Features:
 * - Animated placeholder cycling (Framer Motion fade/slide)
 * - Embedded ThinkingIntentSelector (scales with canvas zoom)
 * - Commit: Enter (without Shift) or blur with non-empty text
 * - Cancel: Escape clears the textarea
 */

import { Handle, Position } from '@xyflow/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MapPin } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ThinkingIntent } from '@/types/thought-map';

import { cn } from '@/lib/utils';

import { ThinkingIntentSelector } from '../ThinkingIntentSelector';
import { MAX_TITLE_LENGTH, PROMPT_CYCLE_MS, SOCRATIC_PROMPTS } from '../thought-map-constants';

// ============================================================================
// Types
// ============================================================================

export interface EditableTopicNodeData {
  error: null | string;
  intent: ThinkingIntent;
  isCreating: boolean;
  onCommit: (text: string) => void;
  onIntentChange: (intent: ThinkingIntent) => void;
}

export interface EditableTopicNodeProps {
  data: EditableTopicNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function EditableTopicNode({ data, selected }: EditableTopicNodeProps) {
  const { error, intent, isCreating, onCommit, onIntentChange } = data;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 100);
    return () => window.clearTimeout(timer);
  }, []);

  // Cycle placeholder text
  useEffect(() => {
    if (text.length > 0 || isCreating) {
      return;
    }

    const interval = window.setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % SOCRATIC_PROMPTS.length);
    }, PROMPT_CYCLE_MS);

    return () => window.clearInterval(interval);
  }, [text.length, isCreating]);

  const handleCommit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed) {
      onCommit(trimmed);
    }
  }, [text, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        setText('');
      }
    },
    [handleCommit]
  );

  const handleBlur = useCallback(() => {
    if (text.trim()) {
      handleCommit();
    }
  }, [text, handleCommit]);

  const showPlaceholder = text.length === 0 && !isCreating;

  return (
    <div
      className={cn(
        // Base — matches TopicNode sizing
        'relative min-w-[260px] max-w-[360px] cursor-default rounded-2xl border-2 p-5',
        // Japandi primary: warm dark tone gradient
        'bg-gradient-to-br from-stone-800 to-stone-900',
        'transition-all duration-200',
        // Border + shadow
        'border-stone-600 shadow-xl shadow-stone-900/30',
        // Selected ring
        selected && [
          'border-stone-400 ring-2 ring-stone-400/40 ring-offset-2 ring-offset-background',
          'shadow-2xl shadow-stone-900/50',
        ],
        !selected && 'hover:border-stone-500 hover:shadow-xl hover:shadow-stone-900/40'
      )}
    >
      {/* Node header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-stone-600/60 p-1.5">
          <MapPin className="h-4 w-4 text-stone-200" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-400">
          Topic
        </span>
      </div>

      {/* Editable textarea or loading state */}
      {isCreating ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-stone-300" />
          <span className="text-sm text-stone-300">Setting up...</span>
        </div>
      ) : (
        <>
          {/* Textarea wrapper with animated placeholder overlay */}
          <div className="relative">
            <textarea
              className={cn(
                'noDrag nowheel',
                'w-full resize-none bg-transparent text-base font-bold leading-snug text-stone-50',
                'border-none outline-none focus:ring-0',
                'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-stone-600'
              )}
              disabled={isCreating}
              maxLength={MAX_TITLE_LENGTH}
              onBlur={handleBlur}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={textareaRef}
              rows={3}
              value={text}
            />

            {/* Animated placeholder overlay */}
            {showPlaceholder && (
              <div className="pointer-events-none absolute inset-0 flex items-start overflow-hidden">
                {prefersReducedMotion ? (
                  <p className="text-base font-bold leading-snug text-stone-500">
                    {SOCRATIC_PROMPTS[promptIndex]}
                  </p>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.p
                      animate={{ opacity: 1, y: 0 }}
                      className="text-base font-bold leading-snug text-stone-500"
                      exit={{ opacity: 0, y: -6 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={promptIndex}
                      transition={{ duration: 0.3 }}
                    >
                      {SOCRATIC_PROMPTS[promptIndex]}
                    </motion.p>
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>

          {/* Character counter */}
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-stone-500">
              {text.length}/{MAX_TITLE_LENGTH}
            </span>
            {text.trim() && (
              <span className="text-[10px] text-stone-500">Press Enter to begin</span>
            )}
          </div>

          {/* Validation error */}
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </>
      )}

      {/* React Flow source handles on all 4 sides (matches TopicNode) */}
      <Handle
        className="!h-3 !w-3 !border-stone-500 !bg-stone-600"
        position={Position.Top}
        type="source"
      />
      <Handle
        className="!h-3 !w-3 !border-stone-500 !bg-stone-600"
        position={Position.Bottom}
        type="source"
      />
      <Handle
        className="!h-3 !w-3 !border-stone-500 !bg-stone-600"
        id="source-left"
        position={Position.Left}
        type="source"
      />
      <Handle
        className="!h-3 !w-3 !border-stone-500 !bg-stone-600"
        id="source-right"
        position={Position.Right}
        type="source"
      />

      {/* Intent selector — embedded in the node so it scales with zoom */}
      {!isCreating && (
        <div className="noDrag nowheel mt-3 border-t border-stone-700/40 pt-3">
          <ThinkingIntentSelector onChange={onIntentChange} value={intent} variant="floating" />
        </div>
      )}
    </div>
  );
}
