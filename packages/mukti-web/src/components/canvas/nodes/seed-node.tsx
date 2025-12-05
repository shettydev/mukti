'use client';

/**
 * SeedNode component for Thinking Canvas
 *
 * The central node displaying the main problem statement.
 * Features:
 * - Primary/accent color styling for visual prominence
 * - Text truncation with tooltip for full text
 * - Selection highlight styling
 * - Exploration status indicator
 *
 * @requirements 1.1, 1.2, 1.3, 1.4, 5.5, 8.1, 8.4
 */

import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Sparkles } from 'lucide-react';

import type { SeedNodeProps } from '@/types/canvas-visualization.types';

import { cn } from '@/lib/utils';
import { SEED_TRUNCATE_LENGTH, shouldTruncate, truncateText } from '@/lib/utils/text-truncation';

/**
 * SeedNode - Central problem statement node
 *
 * Displays the main problem/question at the center of the canvas.
 * Uses primary/accent colors to indicate its central importance.
 *
 * @param data - Node data containing label and exploration status
 * @param selected - Whether the node is currently selected
 */
export function SeedNode({ data, selected }: SeedNodeProps) {
  const { isExplored, label } = data;
  const displayText = truncateText(label, SEED_TRUNCATE_LENGTH);
  const needsTooltip = shouldTruncate(label, SEED_TRUNCATE_LENGTH);

  return (
    <div
      className={cn(
        // Base styles
        'relative min-w-[200px] max-w-[300px] rounded-xl border-2 p-4',
        'bg-gradient-to-br from-primary/10 to-primary/5',
        'transition-all duration-200',
        // Border and shadow
        'border-primary/40 shadow-lg shadow-primary/10',
        // Selection highlight (Requirement 5.5)
        selected && [
          'border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
          'shadow-xl shadow-primary/20',
        ],
        // Hover state
        !selected && 'hover:border-primary/60 hover:shadow-md hover:shadow-primary/15'
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

      {/* Node icon */}
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-lg bg-primary/20 p-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-primary/70">Problem</span>
      </div>

      {/* Node content with text truncation (Requirement 1.4) */}
      <p className="text-sm font-medium leading-relaxed text-foreground">{displayText}</p>

      {/* React Flow handles for edge connections */}
      <Handle
        className="!bg-primary !border-primary/50 !w-3 !h-3"
        position={Position.Top}
        type="source"
      />
      <Handle
        className="!bg-primary !border-primary/50 !w-3 !h-3"
        position={Position.Bottom}
        type="source"
      />
      <Handle
        className="!bg-primary !border-primary/50 !w-3 !h-3"
        position={Position.Left}
        type="source"
      />
      <Handle
        className="!bg-primary !border-primary/50 !w-3 !h-3"
        position={Position.Right}
        type="source"
      />
    </div>
  );
}
