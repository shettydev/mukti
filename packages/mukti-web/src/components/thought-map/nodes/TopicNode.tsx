'use client';

/**
 * TopicNode component for Thought Map canvas
 *
 * The central root node of the Thought Map. Visually distinct from branch nodes:
 * larger, uses primary colour treatment, handles on all 4 sides for edge connections.
 * Features:
 * - Primary/accent styling with gradient background
 * - Source handles on all 4 sides (radial layout needs multi-directional edges)
 * - Right-click to "Add Branch" context menu
 * - Selected state ring highlight
 * - Japandi aesthetic: warm stone tones, minimal, calm
 */

import { Handle, Position } from '@xyflow/react';
import { GitBranch, MapPin, Sparkles } from 'lucide-react';
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
 * Data passed to TopicNode via React Flow's custom node API
 */
export interface TopicNodeData {
  node: ThoughtMapNode;
  onAddBranch: (nodeId: string) => void;
  onSuggestBranches?: (nodeId: string) => void;
}

/**
 * Props for the TopicNode component (React Flow custom node props shape)
 */
export interface TopicNodeProps {
  data: TopicNodeData;
  selected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TopicNode - Central root node of the Thought Map
 *
 * Renders as a large rounded rectangle with primary styling. This node is
 * always at the centre of the radial layout and cannot be deleted.
 *
 * @param data - Node data including the ThoughtMapNode and onAddBranch callback
 * @param selected - Whether the node is currently selected in React Flow
 */
export function TopicNode({ data, selected }: TopicNodeProps) {
  const { node, onAddBranch, onSuggestBranches } = data;

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
            // Base — larger than branch nodes
            'relative min-w-[220px] max-w-[320px] cursor-default rounded-2xl border-2 p-5',
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
            // Hover
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

          {/* Main label — large, bold, warm white */}
          <p className="text-base font-bold leading-snug text-stone-50">{node.label}</p>

          {/* Exploration indicator */}
          {node.isExplored && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400/80">
                Explored
              </span>
            </div>
          )}

          {/* React Flow source handles on all 4 sides for radial edge layout */}
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
            position={Position.Left}
            type="source"
          />
          <Handle
            className="!h-3 !w-3 !border-stone-500 !bg-stone-600"
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
