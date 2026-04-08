'use client';

/**
 * EditableBranchNode — inline editable variant of ThoughtNode.
 *
 * Spawned on the canvas when the user clicks "Add Branch". Mirrors ThoughtNode
 * visually but renders an auto-focused <input> instead of a static label.
 * Uses a dashed border to distinguish it as a draft.
 *
 * The node persists until explicitly confirmed or deleted — clicking outside
 * does NOT remove it, maintaining consistency with other node types.
 *
 * Confirm: Enter with non-empty text, click the Add button, or right-click → "Confirm & Add".
 * Delete: Escape, or right-click → "Delete".
 */

import { Handle, Position } from '@xyflow/react';
import { Check, GitBranch, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const MAX_LABEL_LENGTH = 120;

// ============================================================================
// Types
// ============================================================================

export interface EditableBranchNodeData {
  onCancel: () => void;
  onCommit: (label: string) => void;
  side?: 'left' | 'right';
}

export interface EditableBranchNodeProps {
  data: EditableBranchNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function EditableBranchNode({ data, selected }: EditableBranchNodeProps) {
  const { onCancel, onCommit } = data;

  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const isCommittedRef = useRef(false);

  // Auto-focus on mount
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const doCommit = useCallback(() => {
    if (isCommittedRef.current) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    isCommittedRef.current = true;
    setIsConfirming(true);
    // Let the confirm animation play before the real node replaces this one
    setTimeout(() => onCommit(trimmed), 400);
  }, [text, onCommit]);

  const doCancel = useCallback(() => {
    if (isCommittedRef.current) {
      return;
    }
    isCommittedRef.current = true;
    onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        doCancel();
      }
    },
    [doCommit, doCancel]
  );

  // Prevent mousedown on the node container from stealing focus from the input
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== inputRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  const hasText = text.trim().length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            // Base — matches ThoughtNode sizing
            'relative min-w-[160px] max-w-[260px] cursor-default rounded-xl border p-4',
            // Draft styling: dashed border
            'border-dashed',
            'bg-stone-50 dark:bg-stone-800',
            'transition-all duration-300 ease-out',
            'border-stone-300 dark:border-stone-600',
            'shadow-md shadow-stone-200/60 dark:shadow-stone-900/40',
            // Confirming animation: scale up, solidify border, emerald glow
            isConfirming && [
              'scale-[1.06] border-solid',
              'border-emerald-400 dark:border-emerald-500',
              'shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/40',
              'ring-2 ring-emerald-300/30 ring-offset-2 ring-offset-background',
            ],
            // Selected ring (skip when confirming)
            selected &&
              !isConfirming && [
                'border-stone-400 dark:border-stone-500',
                'ring-2 ring-stone-400/30 ring-offset-2 ring-offset-background',
              ]
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Type badge */}
          <div className="mb-2 flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-stone-400 dark:text-stone-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              New Branch
            </span>
          </div>

          {/* Editable input */}
          <input
            className={cn(
              'noDrag nowheel',
              'w-full bg-transparent text-sm font-medium leading-snug',
              'text-stone-700 dark:text-stone-200',
              'placeholder:text-stone-400 dark:placeholder:text-stone-500',
              'border-none outline-none focus:ring-0'
            )}
            disabled={isConfirming}
            maxLength={MAX_LABEL_LENGTH}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a thought..."
            ref={inputRef}
            type="text"
            value={text}
          />

          {/* Bottom row: character counter + confirm button */}
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              {text.length}/{MAX_LABEL_LENGTH}
            </span>
            <button
              aria-label="Confirm and add branch"
              className={cn(
                'noDrag flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium',
                'transition-all duration-150',
                hasText && !isConfirming
                  ? [
                      'border-emerald-200 bg-emerald-50 text-emerald-600',
                      'hover:bg-emerald-100',
                      'dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-400',
                      'cursor-pointer',
                    ]
                  : [
                      'border-stone-200 bg-stone-100 text-stone-400',
                      'dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500',
                      'cursor-not-allowed opacity-50',
                    ]
              )}
              disabled={!hasText || isConfirming}
              onClick={(e) => {
                e.stopPropagation();
                doCommit();
              }}
            >
              <Check className="h-3 w-3" />
              Add
            </button>
          </div>

          {/* React Flow handles: all four rendered so edges re-route when dragged across hemispheres */}
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            id="target-left"
            position={Position.Left}
            type="target"
          />
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            id="target-right"
            position={Position.Right}
            type="target"
          />
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            id="source-left"
            position={Position.Left}
            type="source"
          />
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            id="source-right"
            position={Position.Right}
            type="source"
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-[180px]">
        <ContextMenuItem disabled={!hasText || isConfirming} inset={false} onClick={doCommit}>
          <Check className="h-4 w-4 text-emerald-500" />
          Confirm & Add Branch
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem inset={false} onClick={doCancel}>
          <Trash2 className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400">Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
