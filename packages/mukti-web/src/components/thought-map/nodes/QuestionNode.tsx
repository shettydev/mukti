'use client';

/**
 * QuestionNode component for Thought Map canvas
 *
 * Represents an AI-suggested question node — a prompt that hasn't been
 * accepted into the map yet. Visually distinct: dashed border, muted/ghost
 * styling, Sparkles icon. Non-functional Accept/Dismiss buttons appear on hover.
 *
 * Features:
 * - Dashed border + reduced opacity (ghost state)
 * - Sparkles icon indicating AI origin
 * - Hoverable Accept / Dismiss action buttons (visual only — wired in canvas)
 * - Target handle on left, source handle on right
 * - Japandi aesthetic: very muted lavender-tinged stone tones
 */

import { Handle, Position } from '@xyflow/react';
import { Check, Sparkles, Trash2, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { ThoughtMapNode } from '@/types/thought-map';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Data passed to QuestionNode via React Flow's custom node API
 */
export interface QuestionNodeData {
  isGhost?: boolean;
  node: ThoughtMapNode;
  onAccept?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDismiss?: (nodeId: string) => void;
}

/**
 * Props for the QuestionNode component (React Flow custom node props shape)
 */
export interface QuestionNodeProps {
  data: QuestionNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * QuestionNode - AI-suggested question node in the Thought Map
 *
 * Renders as a ghost card with dashed border to signal provisional / pending state.
 * Accept and Dismiss actions are shown on hover and wired via callbacks.
 *
 * @param data - Node data including the ThoughtMapNode and optional action callbacks
 * @param selected - Whether the node is currently selected in React Flow
 */
export function QuestionNode({ data, selected }: QuestionNodeProps) {
  const { isGhost = false, node, onAccept, onDeleteNode, onDismiss } = data;
  const [hovered, setHovered] = useState(false);

  const handleAccept = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAccept?.(node.nodeId);
    },
    [node.nodeId, onAccept]
  );

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss?.(node.nodeId);
    },
    [node.nodeId, onDismiss]
  );

  const handleDelete = useCallback(() => {
    onDeleteNode?.(node.nodeId);
  }, [node.nodeId, onDeleteNode]);

  const nodeContent = (
    <div
      className={cn(
        'relative min-w-[160px] max-w-[240px] cursor-default rounded-xl border p-4',
        'transition-all duration-200',
        isGhost
          ? [
              'border-dashed bg-stone-50/60 opacity-70 dark:bg-stone-800/50',
              'border-slate-300 shadow-sm shadow-slate-200/40 dark:border-slate-600 dark:shadow-slate-900/20',
            ]
          : [
              'bg-stone-50 dark:bg-stone-800',
              'border-stone-200 shadow-md shadow-stone-200/60 dark:border-stone-700 dark:shadow-stone-900/40',
            ],
        // Selected / hover raises opacity
        (selected || hovered) && 'opacity-100',
        selected && [
          isGhost
            ? 'border-slate-400 dark:border-slate-500'
            : 'border-stone-400 dark:border-stone-500',
          'ring-2 ring-slate-300/30 ring-offset-2 ring-offset-background',
        ],
        !selected &&
          (isGhost
            ? 'hover:border-slate-400 dark:hover:border-slate-500'
            : 'hover:border-stone-300 dark:hover:border-stone-600')
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isGhost ? (
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-slate-400 dark:text-slate-500" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Suggestion
          </span>
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-stone-400 dark:text-stone-500" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Question
          </span>
        </div>
      )}

      {/* Question label */}
      <p
        className={cn(
          'text-sm font-medium leading-snug',
          isGhost ? 'text-stone-600 dark:text-stone-300' : 'text-stone-700 dark:text-stone-200'
        )}
      >
        {node.label}
      </p>

      {isGhost && (
        <div
          className={cn(
            'mt-3 flex items-center gap-2 transition-opacity duration-150',
            hovered || selected ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            aria-label="Accept suggestion"
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium',
              'border-emerald-200 bg-emerald-50 text-emerald-600',
              'hover:bg-emerald-100',
              'dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-400',
              'transition-colors duration-150'
            )}
            onClick={handleAccept}
          >
            <Check className="h-3 w-3" />
            Accept
          </button>
          <button
            aria-label="Dismiss suggestion"
            className={cn(
              'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium',
              'border-stone-200 bg-stone-50 text-stone-500',
              'hover:bg-stone-100',
              'dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400',
              'transition-colors duration-150'
            )}
            onClick={handleDismiss}
          >
            <X className="h-3 w-3" />
            Dismiss
          </button>
        </div>
      )}

      {/* React Flow handles */}
      <Handle
        className="!h-2.5 !w-2.5 !border-slate-300 !bg-slate-200 dark:!border-slate-600 dark:!bg-slate-700"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!h-2.5 !w-2.5 !border-slate-300 !bg-slate-200 dark:!border-slate-600 dark:!bg-slate-700"
        position={Position.Right}
        type="source"
      />
    </div>
  );

  // Ghost nodes don't get a context menu
  if (isGhost) {
    return nodeContent;
  }

  // Non-ghost question nodes get a context menu with Delete
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px]">
        {onDeleteNode && (
          <ContextMenuItem inset={false} onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Delete</span>
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
