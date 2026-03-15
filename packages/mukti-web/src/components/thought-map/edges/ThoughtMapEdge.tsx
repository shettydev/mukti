'use client';

/**
 * ThoughtMapEdge component for Thought Map canvas
 *
 * Custom bezier edge renderer for connections between Thought Map nodes.
 * Uses muted stone strokes without arrowheads for a calm, minimal look.
 *
 * Features:
 * - Smooth bezier path via getBezierPath
 * - Muted stone stroke colour (adapts to dark mode)
 * - No arrowheads (tree structure implies direction)
 * - Slightly thicker for selected state
 * - Japandi aesthetic: understated, warm
 */

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ThoughtMapEdge (React Flow custom edge props shape)
 */
export interface ThoughtMapEdgeProps {
  id: string;
  label?: string;
  selected?: boolean;
  sourcePosition: Position;
  sourceX: number;
  sourceY: number;
  targetPosition: Position;
  targetX: number;
  targetY: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ThoughtMapEdge - Custom bezier edge for Thought Map connections
 *
 * Renders a smooth curved line between parent and child nodes.
 * No arrowheads — the radial layout makes direction self-evident.
 *
 * @param props - React Flow edge props
 */
export function ThoughtMapEdge({
  id,
  label,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}: ThoughtMapEdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? 'oklch(0.55 0.02 60)' : 'oklch(0.72 0.02 60)',
          strokeOpacity: selected ? 0.9 : 0.55,
          strokeWidth: selected ? 2 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s, stroke-opacity 0.15s',
        }}
      />

      {/* Optional edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan absolute -translate-x-1/2 -translate-y-1/2',
              'rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium',
              'text-stone-500 shadow-sm',
              'dark:bg-stone-900/90 dark:text-stone-400'
            )}
            style={{
              left: labelX,
              pointerEvents: 'all',
              top: labelY,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
