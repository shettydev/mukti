'use client';

/**
 * RootNode component for Thinking Canvas
 *
 * Satellite node representing assumptions to examine.
 * Features:
 * - Tertiary color styling distinct from Seed and Soil nodes
 * - Text truncation with tooltip for full text
 * - Selection highlight styling
 * - Exploration status indicator
 *
 * @requirements 3.1, 3.3, 3.5, 5.5, 8.3, 8.4
 */

import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, GitBranch, MessageCircle } from 'lucide-react';

import type { RootNodeProps } from '@/types/canvas-visualization.types';

import { cn } from '@/lib/utils';
import {
  SATELLITE_TRUNCATE_LENGTH,
  shouldTruncate,
  truncateText,
} from '@/lib/utils/text-truncation';

/**
 * RootNode - Assumption satellite node
 *
 * Displays assumptions that underlie the problem and may need
 * to be examined through Socratic dialogue. Uses tertiary colors
 * to differentiate from Seed and Soil nodes.
 *
 * @param data - Node data containing label, index, exploration status, and message count
 * @param selected - Whether the node is currently selected
 */
export function RootNode({ data, selected }: RootNodeProps) {
  const { index, isExplored, label, messageCount = 0 } = data;
  const displayText = truncateText(label, SATELLITE_TRUNCATE_LENGTH);
  const needsTooltip = shouldTruncate(label, SATELLITE_TRUNCATE_LENGTH);
  const hasMessages = messageCount > 0;

  return (
    <div
      className={cn(
        // Base styles
        'relative min-w-[150px] max-w-[220px] rounded-lg border-2 p-3',
        'bg-gradient-to-br from-violet-500/10 to-violet-500/5',
        'transition-all duration-200',
        // Border and shadow (Requirement 3.3 - distinct visual style)
        'border-violet-500/40 shadow-md shadow-violet-500/10',
        // Selection highlight (Requirement 5.5)
        selected && [
          'border-violet-500 ring-2 ring-violet-500/30 ring-offset-2 ring-offset-background',
          'shadow-lg shadow-violet-500/20',
        ],
        // Hover state
        !selected && 'hover:border-violet-500/60 hover:shadow-md hover:shadow-violet-500/15'
      )}
      title={needsTooltip ? label : undefined}
    >
      {/* Exploration status indicator (Requirements 6.1, 6.2) */}
      {(isExplored || hasMessages) && (
        <div
          className={cn(
            'absolute -top-2 -right-2 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shadow-sm',
            isExplored ? 'bg-green-500' : 'bg-violet-500/80'
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
        <div className="rounded-md bg-violet-500/20 p-1">
          <GitBranch className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-violet-600/70 dark:text-violet-400/70">
          Assumption {index + 1}
        </span>
      </div>

      {/* Node content with text truncation (Requirement 3.5) */}
      <p className="text-sm leading-relaxed text-foreground/90">{displayText}</p>

      {/* React Flow handle for edge connection to Seed */}
      <Handle
        className="!bg-violet-500 !border-violet-500/50 !w-2.5 !h-2.5"
        position={Position.Left}
        type="target"
      />
    </div>
  );
}
