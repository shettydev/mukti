'use client';

/**
 * SoilNode component for Thinking Canvas
 *
 * Satellite node representing context items and constraints.
 * Features:
 * - Secondary color styling distinct from Seed and Root nodes
 * - Text truncation with tooltip for full text
 * - Selection highlight styling
 * - Exploration status indicator
 *
 * @requirements 2.1, 2.3, 2.5, 5.5, 8.2, 8.4
 */

import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Layers } from 'lucide-react';

import type { SoilNodeProps } from '@/types/canvas-visualization.types';

import { cn } from '@/lib/utils';
import {
  SATELLITE_TRUNCATE_LENGTH,
  shouldTruncate,
  truncateText,
} from '@/lib/utils/text-truncation';

/**
 * SoilNode - Context/constraint satellite node
 *
 * Displays context items that provide background and constraints
 * for the problem. Uses secondary colors to differentiate from
 * Seed and Root nodes.
 *
 * @param data - Node data containing label, index, and exploration status
 * @param selected - Whether the node is currently selected
 */
export function SoilNode({ data, selected }: SoilNodeProps) {
  const { index, isExplored, label } = data;
  const displayText = truncateText(label, SATELLITE_TRUNCATE_LENGTH);
  const needsTooltip = shouldTruncate(label, SATELLITE_TRUNCATE_LENGTH);

  return (
    <div
      className={cn(
        // Base styles
        'relative min-w-[150px] max-w-[220px] rounded-lg border-2 p-3',
        'bg-gradient-to-br from-amber-500/10 to-amber-500/5',
        'transition-all duration-200',
        // Border and shadow (Requirement 2.3 - distinct visual style)
        'border-amber-500/40 shadow-md shadow-amber-500/10',
        // Selection highlight (Requirement 5.5)
        selected && [
          'border-amber-500 ring-2 ring-amber-500/30 ring-offset-2 ring-offset-background',
          'shadow-lg shadow-amber-500/20',
        ],
        // Hover state
        !selected && 'hover:border-amber-500/60 hover:shadow-md hover:shadow-amber-500/15'
      )}
      title={needsTooltip ? label : undefined}
    >
      {/* Exploration status indicator (Requirement 8.4) */}
      {isExplored && (
        <div
          className="absolute -top-2 -right-2 rounded-full bg-green-500 p-1 shadow-sm"
          title="Explored through dialogue"
        >
          <CheckCircle2 className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Node header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-md bg-amber-500/20 p-1">
          <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-amber-600/70 dark:text-amber-400/70">
          Context {index + 1}
        </span>
      </div>

      {/* Node content with text truncation (Requirement 2.5) */}
      <p className="text-sm leading-relaxed text-foreground/90">{displayText}</p>

      {/* React Flow handle for edge connection to Seed */}
      <Handle
        className="!bg-amber-500 !border-amber-500/50 !w-2.5 !h-2.5"
        position={Position.Right}
        type="target"
      />
    </div>
  );
}
