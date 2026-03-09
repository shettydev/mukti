'use client';

/**
 * ThoughtNode component for Thought Map canvas
 *
 * Represents branch (depth 1) and leaf (depth 2+) nodes in the Thought Map.
 * Features:
 * - Type badge showing branch/leaf
 * - Target handle (incoming connection) on left side
 * - Source handle (outgoing connection) on right side
 * - Selected state ring highlight
 * - Explored dot indicator
 * - Right-click context menu with "Add Branch" (for non-leaf nodes)
 * - Japandi aesthetic: warm stone tones, minimal, calm
 */

import { Handle, Position } from '@xyflow/react';
import { GitBranch, Leaf } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { ThoughtMapNode } from '@/types/thought-map';

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
  const { node, onAddBranch } = data;
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const isBranch = node.type === 'branch';

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  }, []);

  const handleAddBranch = useCallback(() => {
    setContextMenuOpen(false);
    onAddBranch(node.nodeId);
  }, [node.nodeId, onAddBranch]);

  const handleCloseMenu = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  return (
    <>
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
        onContextMenu={handleContextMenu}
      >
        {/* Type badge */}
        <div className="mb-2 flex items-center gap-1.5">
          {isBranch ? (
            <GitBranch className="h-3 w-3 text-stone-400 dark:text-stone-500" />
          ) : (
            <Leaf className="h-3 w-3 text-stone-400 dark:text-stone-500" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {isBranch ? 'Branch' : 'Leaf'}
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

      {/* Context menu — only offer "Add Branch" for branch nodes */}
      {contextMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleCloseMenu} />
          <div
            className={cn(
              'fixed z-50 min-w-[160px] rounded-lg border border-stone-200 bg-white p-1 shadow-lg',
              'dark:border-stone-700 dark:bg-stone-900'
            )}
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            {isBranch && (
              <button
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                  'text-stone-700 hover:bg-stone-100',
                  'dark:text-stone-200 dark:hover:bg-stone-800',
                  'transition-colors duration-150'
                )}
                onClick={handleAddBranch}
              >
                <GitBranch className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                Add Branch
              </button>
            )}
            {!isBranch && (
              <div className="px-3 py-2 text-xs text-stone-400 dark:text-stone-500">
                No actions available
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
