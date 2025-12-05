'use client';

/**
 * DialogueHeader component
 *
 * Header for the node dialogue chat panel showing node context,
 * message count, and start dialogue button.
 *
 * @requirements 1.2 - Display node content as context
 * @requirements 5.4 - Offer to start new dialogue for nodes without history
 */

import { Lightbulb, MessageSquare, Play, Sprout, TreeDeciduous } from 'lucide-react';

import type { CanvasNode } from '@/types/canvas-visualization.types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for DialogueHeader component
 * @property hasHistory - Whether the node has existing dialogue history
 * @property messageCount - Number of messages in the dialogue
 * @property node - The canvas node being discussed
 * @property onStartDialogue - Callback when user clicks "Start Dialogue"
 */
export interface DialogueHeaderProps {
  hasHistory: boolean;
  messageCount: number;
  node: CanvasNode;
  onStartDialogue: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Node type display configuration
 */
const NODE_TYPE_CONFIG = {
  insight: {
    color: 'text-purple-500',
    icon: Lightbulb,
    label: 'Insight',
  },
  root: {
    color: 'text-amber-600',
    icon: TreeDeciduous,
    label: 'Assumption',
  },
  seed: {
    color: 'text-green-600',
    icon: Sprout,
    label: 'Problem',
  },
  soil: {
    color: 'text-blue-600',
    icon: Sprout,
    label: 'Context',
  },
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * DialogueHeader - Header for node dialogue panel
 *
 * Features:
 * - Node type indicator with icon
 * - Node content/label display
 * - Message count badge
 * - "Start Dialogue" button for nodes without history
 *
 * @example
 * ```tsx
 * <DialogueHeader
 *   node={selectedNode}
 *   messageCount={5}
 *   hasHistory={true}
 *   onStartDialogue={() => startDialogue(selectedNode.id)}
 * />
 * ```
 */
export function DialogueHeader({
  hasHistory,
  messageCount,
  node,
  onStartDialogue,
}: DialogueHeaderProps) {
  const nodeType = node.type as keyof typeof NODE_TYPE_CONFIG;
  const config = NODE_TYPE_CONFIG[nodeType] ?? NODE_TYPE_CONFIG.seed;
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-3 border-b pb-4">
      {/* Node type and message count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className="text-sm font-medium">{config.label}</span>
        </div>

        {messageCount > 0 && (
          <Badge className="gap-1" variant="secondary">
            <MessageSquare className="h-3 w-3" />
            {messageCount}
          </Badge>
        )}
      </div>

      {/* Node content */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm leading-relaxed">{node.data.label}</p>
      </div>

      {/* Start dialogue button for nodes without history */}
      {!hasHistory && (
        <Button className="w-full gap-2" onClick={onStartDialogue} variant="default">
          <Play className="h-4 w-4" />
          Start Dialogue
        </Button>
      )}

      {/* Continue dialogue hint for nodes with history */}
      {hasHistory && (
        <p className="text-xs text-muted-foreground">
          Continue exploring this {config.label.toLowerCase()} below
        </p>
      )}
    </div>
  );
}
