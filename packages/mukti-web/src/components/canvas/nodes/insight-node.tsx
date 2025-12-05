'use client';

/**
 * InsightNode component for Thinking Canvas
 *
 * Node representing insights discovered through dialogue.
 * Features:
 * - Distinct emerald/teal color styling (different from Seed/Soil/Root)
 * - Text truncation with tooltip for full text
 * - Selection highlight styling
 * - Exploration status indicator
 *
 * @requirements 3.5
 */

import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Lightbulb, MessageCircle } from 'lucide-react';

import type { InsightNodeProps } from '@/types/canvas-visualization.types';

import { cn } from '@/lib/utils';
import {
  SATELLITE_TRUNCATE_LENGTH,
  shouldTruncate,
  truncateText,
} from '@/lib/utils/text-truncation';

/**
 * InsightNode - Dialogue discovery node
 *
 * Displays insights that emerged from Socratic dialogue.
 * Uses emerald/teal colors to differentiate from other node types
 * and indicate that it emerged from dialogue exploration.
 *
 * @param data - Node data containing label, parentNodeId, exploration status, and message count
 * @param selected - Whether the node is currently selected
 */
export function InsightNode({ data, selected }: InsightNodeProps) {
  const { isExplored, label, messageCount = 0 } = data;
  const displayText = truncateText(label, SATELLITE_TRUNCATE_LENGTH);
  const needsTooltip = shouldTruncate(label, SATELLITE_TRUNCATE_LENGTH);
  const hasMessages = messageCount > 0;

  return (
    <div
      className={cn(
        // Base styles
        'relative min-w-[150px] max-w-[220px] rounded-lg border-2 p-3',
        'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
        'transition-all duration-200',
        // Border and shadow (Requirement 3.5 - distinct visual style)
        'border-emerald-500/40 shadow-md shadow-emerald-500/10',
        // Dashed border to indicate it emerged from dialogue
        'border-dashed',
        // Selection highlight
        selected && [
          'border-emerald-500 border-solid ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-background',
          'shadow-lg shadow-emerald-500/20',
        ],
        // Hover state
        !selected && 'hover:border-emerald-500/60 hover:shadow-md hover:shadow-emerald-500/15'
      )}
      title={needsTooltip ? label : undefined}
    >
      {/* Exploration status indicator (Requirements 6.1, 6.2) */}
      {(isExplored || hasMessages) && (
        <div
          className={cn(
            'absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm',
            isExplored ? 'bg-green-500' : 'bg-emerald-500/80'
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

      {/* Node header */}
      <div className="mb-2 flex items-center gap-2">
        <div className="rounded-md bg-emerald-500/20 p-1">
          <Lightbulb className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
          Insight
        </span>
      </div>

      {/* Node content with text truncation */}
      <p className="text-sm leading-relaxed text-foreground/90">{displayText}</p>

      {/* React Flow handle for edge connection to parent */}
      <Handle
        className="!bg-emerald-500 !border-emerald-500/50 !w-2.5 !h-2.5"
        position={Position.Top}
        type="target"
      />
      {/* Source handle for potential child insights */}
      <Handle
        className="!bg-emerald-500 !border-emerald-500/50 !w-2.5 !h-2.5"
        position={Position.Bottom}
        type="source"
      />
    </div>
  );
}
