'use client';

import type { ThinkingIntent } from '@/types/thought-map';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { THINKING_INTENTS } from './thought-map-constants';

// ============================================================================
// Types
// ============================================================================

interface ThinkingIntentSelectorProps {
  onChange: (intent: ThinkingIntent) => void;
  value: ThinkingIntent;
  variant?: 'dialog' | 'floating';
}

// ============================================================================
// Component
// ============================================================================

export function ThinkingIntentSelector({
  onChange,
  value,
  variant = 'dialog',
}: ThinkingIntentSelectorProps) {
  const isFloating = variant === 'floating';

  return (
    <div
      className={cn(
        isFloating ? 'grid grid-cols-4 gap-1' : 'grid grid-cols-2 gap-1.5 sm:grid-cols-4'
      )}
    >
      {THINKING_INTENTS.map((intent) => {
        const Icon = intent.icon;
        const isSelected = value === intent.value;

        return (
          <Button
            className={cn(
              'h-auto min-w-0 gap-1 rounded-lg shadow-none',
              isFloating ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs',
              isSelected
                ? 'border-stone-400 bg-stone-100 text-stone-900 dark:border-stone-500 dark:bg-stone-800 dark:text-stone-100'
                : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-300'
            )}
            key={intent.value}
            onClick={() => onChange(intent.value)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
            variant="outline"
          >
            <Icon className={cn('shrink-0', isFloating ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            {intent.label}
          </Button>
        );
      })}
    </div>
  );
}
