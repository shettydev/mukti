'use client';

/**
 * ThoughtMapToolbar component
 *
 * Floating toolbar panel for the Thought Map canvas. Provides:
 * - Zoom In / Zoom Out / Fit View controls (via useReactFlow)
 * - "Add Branch" button (enabled only when a branch/topic node is selected)
 *
 * Positioned as a floating card over the canvas (absolute, bottom-left).
 * Japandi aesthetic: warm stone surface, minimal icons, calm transitions.
 */

import { useReactFlow } from '@xyflow/react';
import { GitBranch, Maximize2, Minus, Plus } from 'lucide-react';
import { useCallback } from 'react';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ThoughtMapToolbarProps {
  /** Whether the selected node can have a branch added (topic or branch type) */
  canAddBranch: boolean;
  /** Called when "Add Branch" is clicked */
  onAddBranch: () => void;
  /** nodeId of the currently selected node, or null */
  selectedNodeId: null | string;
}

interface ToolbarButtonProps {
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ThoughtMapToolbar - Floating action panel for the Thought Map canvas
 *
 * Uses `useReactFlow()` hook — must be rendered inside a `ReactFlowProvider`.
 * Renders zoom controls and a context-aware "Add Branch" button.
 *
 * @param selectedNodeId - Currently selected node ID (or null)
 * @param canAddBranch - Whether the selected node supports adding children
 * @param onAddBranch - Callback when "Add Branch" is triggered
 */
export function ThoughtMapToolbar({
  canAddBranch,
  onAddBranch,
  selectedNodeId,
}: ThoughtMapToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 300, padding: 0.15 });
  }, [fitView]);

  return (
    <div
      aria-label="Thought map controls"
      className={cn(
        // Floating card — positioned by parent canvas wrapper
        'flex items-center gap-1 rounded-xl border',
        'border-stone-200 bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur-sm',
        'dark:border-stone-700 dark:bg-stone-900/90'
      )}
      role="toolbar"
    >
      {/* Zoom controls */}
      <ToolbarButton aria-label="Zoom in" onClick={handleZoomIn} title="Zoom in">
        <Plus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton aria-label="Zoom out" onClick={handleZoomOut} title="Zoom out">
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton aria-label="Fit view" onClick={handleFitView} title="Fit view">
        <Maximize2 className="h-4 w-4" />
      </ToolbarButton>

      {/* Divider */}
      <div
        aria-hidden="true"
        className="mx-1 h-5 w-px rounded-full bg-stone-200 dark:bg-stone-700"
      />

      {/* Add Branch — enabled only when a compatible node is selected */}
      <button
        aria-label="Add branch to selected node"
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium',
          'transition-all duration-150',
          canAddBranch && selectedNodeId
            ? [
                'bg-stone-800 text-stone-50 shadow-sm',
                'hover:bg-stone-700',
                'dark:bg-stone-200 dark:text-stone-900',
                'dark:hover:bg-stone-300',
              ]
            : 'cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600'
        )}
        disabled={!canAddBranch || !selectedNodeId}
        onClick={onAddBranch}
        title={
          !selectedNodeId
            ? 'Select a node first'
            : !canAddBranch
              ? 'Cannot add branch to a leaf node'
              : 'Add branch'
        }
      >
        <GitBranch className="h-3.5 w-3.5" />
        Add Branch
      </button>
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function ToolbarButton({
  'aria-label': ariaLabel,
  children,
  className,
  disabled,
  onClick,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 dark:text-stone-300',
        'transition-colors duration-150',
        disabled
          ? 'cursor-not-allowed opacity-30'
          : [
              'hover:bg-stone-100 hover:text-stone-800',
              'dark:hover:bg-stone-700 dark:hover:text-stone-100',
            ],
        className
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
