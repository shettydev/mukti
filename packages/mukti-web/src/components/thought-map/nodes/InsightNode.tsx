'use client';

/**
 * InsightNode component for Thought Map canvas
 *
 * Represents a dialogue-discovered insight — a breakthrough realisation that
 * emerged from Socratic conversation. Uses warm amber/gold accent styling to
 * visually distinguish insights from ordinary branches.
 *
 * Features:
 * - Amber/gold accent border and warm tinted background
 * - Lightbulb icon indicating insight origin
 * - Target handle (incoming) on left, source handle (outgoing) on right
 * - Selected state ring highlight
 * - Japandi aesthetic: warm amber tones, minimal
 */

import { Handle, Position } from '@xyflow/react';
import { Lightbulb, Trash2 } from 'lucide-react';
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
 * Data passed to InsightNode via React Flow's custom node API
 */
export interface InsightNodeData {
  node: ThoughtMapNode;
  onDeleteNode?: (nodeId: string) => void;
  /** Which hemisphere this node sits in — drives handle placement for clean edge routing */
  side?: 'left' | 'right';
}

/**
 * Props for the InsightNode component (React Flow custom node props shape)
 */
export interface InsightNodeProps {
  data: InsightNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * InsightNode - Dialogue-discovered insight node in the Thought Map
 *
 * Renders as a compact rounded rectangle with warm amber/gold accent styling.
 * Insights are auto-generated from Socratic dialogue and cannot be manually added.
 *
 * @param data - Node data including the ThoughtMapNode
 * @param selected - Whether the node is currently selected in React Flow
 */
export function InsightNode({ data, selected }: InsightNodeProps) {
  const { node, onDeleteNode, side = 'right' } = data;

  const handleDelete = useCallback(() => {
    onDeleteNode?.(node.nodeId);
  }, [node.nodeId, onDeleteNode]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            // Base
            'relative min-w-[160px] max-w-[260px] cursor-default rounded-xl border p-4',
            // Warm amber-tinted background
            'bg-amber-50 dark:bg-amber-950/40',
            'transition-all duration-200',
            // Amber accent border
            'border-amber-200 dark:border-amber-700/60',
            'shadow-md shadow-amber-100/60 dark:shadow-amber-900/30',
            // Selected ring
            selected && [
              'border-amber-400 dark:border-amber-500',
              'ring-2 ring-amber-300/40 ring-offset-2 ring-offset-background',
              'shadow-lg shadow-amber-200/40 dark:shadow-amber-900/40',
            ],
            // Hover
            !selected && 'hover:border-amber-300 dark:hover:border-amber-600'
          )}
        >
          {/* Header: insight badge */}
          <div className="mb-2 flex items-center gap-1.5">
            <div className="rounded-md bg-amber-100 p-1 dark:bg-amber-900/50">
              <Lightbulb className="h-3 w-3 text-amber-500 dark:text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 dark:text-amber-400">
              Insight
            </span>
          </div>

          {/* Insight label */}
          <p className="text-sm font-medium leading-snug text-stone-700 dark:text-amber-100/90">
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

          {/* React Flow handles: side-aware for correct edge routing in radial layout */}
          {side === 'left' ? (
            <>
              <Handle
                className="!h-2.5 !w-2.5 !border-amber-200 !bg-amber-100 dark:!border-amber-700 dark:!bg-amber-900/60"
                id="target-right"
                position={Position.Right}
                type="target"
              />
              <Handle
                className="!h-2.5 !w-2.5 !border-amber-200 !bg-amber-100 dark:!border-amber-700 dark:!bg-amber-900/60"
                id="source-left"
                position={Position.Left}
                type="source"
              />
            </>
          ) : (
            <>
              <Handle
                className="!h-2.5 !w-2.5 !border-amber-200 !bg-amber-100 dark:!border-amber-700 dark:!bg-amber-900/60"
                id="target-left"
                position={Position.Left}
                type="target"
              />
              <Handle
                className="!h-2.5 !w-2.5 !border-amber-200 !bg-amber-100 dark:!border-amber-700 dark:!bg-amber-900/60"
                id="source-right"
                position={Position.Right}
                type="source"
              />
            </>
          )}
        </div>
      </ContextMenuTrigger>
      {onDeleteNode && (
        <ContextMenuContent className="min-w-[160px]">
          <ContextMenuItem inset={false} onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Delete Insight</span>
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
