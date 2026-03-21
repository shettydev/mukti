'use client';

/**
 * EditableBranchNode — inline editable variant of ThoughtNode.
 *
 * Spawned on the canvas when the user clicks "Add Branch". Mirrors ThoughtNode
 * visually but renders an auto-focused <input> instead of a static label.
 * Uses a dashed border to distinguish it as a draft.
 *
 * Commit: Enter with non-empty text, or blur with non-empty text.
 * Cancel: Escape, or blur with empty text.
 */

import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const { onCancel, onCommit, side = 'right' } = data;

  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');

  // Auto-focus on mount
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, []);

  const nodeRef = useRef<HTMLDivElement>(null);
  const isCommittedRef = useRef(false);

  const doCommit = useCallback(() => {
    if (isCommittedRef.current) {
      return;
    }
    isCommittedRef.current = true;
    const trimmed = text.trim();
    if (trimmed) {
      onCommit(trimmed);
    } else {
      onCancel();
    }
  }, [text, onCancel, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        isCommittedRef.current = true;
        onCancel();
      }
    },
    [doCommit, onCancel]
  );

  // On blur, check if the new focus target is still within this node.
  // If so, re-focus the input. Otherwise, commit/cancel.
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const related = e.relatedTarget as Node | null;
      if (related && nodeRef.current?.contains(related)) {
        // Focus moved within the node — re-focus the input
        inputRef.current?.focus();
        return;
      }
      // Use a timeout to let React Flow finish its event cycle
      setTimeout(() => {
        if (isCommittedRef.current) {
          return;
        }
        doCommit();
      }, 150);
    },
    [doCommit]
  );

  // Prevent mousedown on the node container from stealing focus from the input
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== inputRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  return (
    <div
      className={cn(
        // Base — matches ThoughtNode sizing
        'relative min-w-[160px] max-w-[260px] cursor-default rounded-xl border p-4',
        // Draft styling: dashed border
        'border-dashed',
        'bg-stone-50 dark:bg-stone-800',
        'transition-all duration-200',
        'border-stone-300 dark:border-stone-600',
        'shadow-md shadow-stone-200/60 dark:shadow-stone-900/40',
        // Selected ring
        selected && [
          'border-stone-400 dark:border-stone-500',
          'ring-2 ring-stone-400/30 ring-offset-2 ring-offset-background',
        ]
      )}
      onMouseDown={handleMouseDown}
      ref={nodeRef}
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
        maxLength={MAX_LABEL_LENGTH}
        onBlur={handleBlur}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a thought..."
        ref={inputRef}
        type="text"
        value={text}
      />

      {/* Character counter */}
      <div className="mt-1.5">
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          {text.length}/{MAX_LABEL_LENGTH}
        </span>
      </div>

      {/* React Flow handles: side-aware (matches ThoughtNode) */}
      {side === 'left' ? (
        <>
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
        </>
      ) : (
        <>
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            id="target-left"
            position={Position.Left}
            type="target"
          />
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            id="source-right"
            position={Position.Right}
            type="source"
          />
        </>
      )}
    </div>
  );
}
