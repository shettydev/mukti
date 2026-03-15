'use client';

/**
 * ThoughtNode component for Thought Map canvas
 *
 * Represents non-topic nodes in the Thought Map.
 * Features:
 * - Type badge showing branch or thought
 * - Target handle (incoming connection) on left side
 * - Source handle (outgoing connection) on right side
 * - Selected state ring highlight
 * - Explored dot indicator
 * - Right-click context menu with "Add Branch"
 * - Japandi aesthetic: warm stone tones, minimal, calm
 */

import { Handle, Position } from '@xyflow/react';
import { GitBranch, Sparkles } from 'lucide-react';
import { useCallback } from 'react';

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
 * Data passed to ThoughtNode via React Flow's custom node API
 */
export interface ThoughtNodeData {
  node: ThoughtMapNode;
  onAddBranch: (nodeId: string) => void;
  onSuggestBranches?: (nodeId: string) => void;
}

/**
 * Props for the ThoughtNode component (React Flow custom node props shape)
 */
export interface ThoughtNodeProps {
  data: ThoughtNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ThoughtNode - Branch and leaf node of the Thought Map
 *
 * Renders as a compact rounded rectangle with muted stone styling.
 * Branch nodes (depth 1) allow adding children; leaf nodes (depth 2+) do not.
 *
 * @param data - Node data including the ThoughtMapNode and onAddBranch callback
 * @param selected - Whether the node is currently selected in React Flow
 */
export function ThoughtNode({ data, selected }: ThoughtNodeProps) {
  const { node, onAddBranch, onSuggestBranches } = data;
  const badgeLabel = node.depth === 1 ? 'Branch' : 'Thought';

  const handleAddBranch = useCallback(() => {
    onAddBranch(node.nodeId);
  }, [node.nodeId, onAddBranch]);

  const handleSuggestBranches = useCallback(() => {
    onSuggestBranches?.(node.nodeId);
  }, [node.nodeId, onSuggestBranches]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            // Base
            'relative min-w-[160px] max-w-[260px] cursor-default rounded-xl border p-4',
            // Japandi neutral: light warm background in light mode, deep stone in dark
            'bg-stone-50 dark:bg-stone-800',
            'transition-all duration-200',
            // Border
            'border-stone-200 dark:border-stone-700',
            'shadow-md shadow-stone-200/60 dark:shadow-stone-900/40',
            // Selected ring
            selected && [
              'border-stone-400 dark:border-stone-500',
              'ring-2 ring-stone-400/30 ring-offset-2 ring-offset-background',
            ],
            // Hover
            !selected && 'hover:border-stone-300 dark:hover:border-stone-600'
          )}
        >
          {/* Type badge */}
          <div className="mb-2 flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-stone-400 dark:text-stone-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {badgeLabel}
            </span>
          </div>

          {/* Label */}
          <p className="text-sm font-medium leading-snug text-stone-700 dark:text-stone-200">
            {node.label}
          </p>

          {/* Explored indicator */}
          {node.isExplored && (
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-500/80 dark:text-emerald-400/80">
                Explored
              </span>
            </div>
          )}

          {/* React Flow handles: target (incoming) on left, source (outgoing) on right */}
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            position={Position.Left}
            type="target"
          />
          <Handle
            className="!h-2.5 !w-2.5 !border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700"
            position={Position.Right}
            type="source"
          />
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="min-w-[180px]">
        <ContextMenuItem inset={false} onClick={handleAddBranch}>
          <GitBranch className="h-4 w-4 text-stone-500 dark:text-stone-400" />
          Add Branch
        </ContextMenuItem>
        {onSuggestBranches && (
          <ContextMenuItem inset={false} onClick={handleSuggestBranches}>
            <Sparkles className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            Suggest Branches
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
