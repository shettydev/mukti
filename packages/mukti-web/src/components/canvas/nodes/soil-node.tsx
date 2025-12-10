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
import { CheckCircle2, Layers, Link2, MessageCircle } from 'lucide-react';

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
 * @param data - Node data containing label, index, exploration status, and message count
 * @param selected - Whether the node is currently selected
 */
export function SoilNode({ data, selected }: SoilNodeProps) {
  const { index, isExplored, label, messageCount = 0, relationshipCount = 0 } = data;
  const displayText = truncateText(label, SATELLITE_TRUNCATE_LENGTH);
  const needsTooltip = shouldTruncate(label, SATELLITE_TRUNCATE_LENGTH);
  const hasMessages = messageCount > 0;
  const hasRelationships = relationshipCount > 0;

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
      {/* Exploration status indicator (Requirements 6.1, 6.2) */}
      {(isExplored || hasMessages) && (
        <div
          className={cn(
            'absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm',
            isExplored ? 'bg-green-500' : 'bg-amber-500/80'
          )}
          title={
            isExplored
              ? `Explored through dialogue (${messageCount} messages)`
              : `${messageCount} message${messageCount !== 1 ? 's' : ''}`
          }
        >
          {isExplored ? (
            <CheckCircle2 className="h-3 w-3 text-white" />
          ) : (
            <>
              <MessageCircle className="h-2.5 w-2.5 text-white" />
              <span className="text-[10px] font-medium text-white">{messageCount}</span>
            </>
          )}
        </div>
      )}

      {/* Relationship count indicator (Requirement 4.4) */}
      {hasRelationships && (
        <div
          className="absolute -bottom-2 -right-2 flex items-center gap-0.5 rounded-full bg-amber-500/80 px-1.5 py-0.5 shadow-sm"
          title={`${relationshipCount} linked assumption${relationshipCount !== 1 ? 's' : ''}`}
        >
          <Link2 className="h-2.5 w-2.5 text-white" />
          <span className="text-[10px] font-medium text-white">{relationshipCount}</span>
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
