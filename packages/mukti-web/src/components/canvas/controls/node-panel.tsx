'use client';

/**
 * NodePanel component for Thinking Canvas
 *
 * Side panel displaying details of the selected node.
 * Shows full text content and provides action buttons.
 *
 * @requirements 5.4
 */

import { CheckCircle2, GitBranch, Layers, MessageCircle, Sparkles, X } from 'lucide-react';

import type { NodePanelProps, NodeType } from '@/types/canvas-visualization.types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Node type configuration for display
 */
interface NodeTypeConfig {
  color: string;
  icon: React.ReactNode;
  label: string;
}

/**
 * NodePanel - Selected node details panel
 *
 * Displays full content of the selected node in a side panel.
 * Includes a placeholder for "Start Dialogue" button for Phase 3.
 *
 * @param selectedNode - Currently selected node or null
 * @param onClose - Handler for closing the panel
 * @param onStartDialogue - Handler for starting dialogue (Phase 3)
 */
export function NodePanel({ onClose, onStartDialogue, selectedNode }: NodePanelProps) {
  if (!selectedNode) {
    return null;
  }

  const nodeType = selectedNode.type as NodeType;
  const config = getNodeTypeConfig(nodeType);
  const { isExplored, label } = selectedNode.data;
  const index = 'index' in selectedNode.data ? selectedNode.data.index : undefined;

  return (
    <div
      className={cn(
        'flex w-80 flex-col rounded-lg border bg-background/95',
        'shadow-lg backdrop-blur-sm'
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className={config.color}>{config.icon}</span>
          <span className="text-sm font-medium">
            {config.label}
            {index !== undefined && ` ${index + 1}`}
          </span>
          {isExplored && (
            <div
              className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5"
              title="Explored through dialogue"
            >
              <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400">Explored</span>
            </div>
          )}
        </div>
        <Button
          aria-label="Close panel"
          className="h-7 w-7"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Panel content */}
      <div className="flex-1 p-4">
        <p className="text-sm leading-relaxed text-foreground">{label}</p>
      </div>

      {/* Panel actions */}
      <div className="border-t p-3">
        {/* Phase 3 integration: Start Dialogue button */}
        <Button
          className="w-full"
          disabled={!onStartDialogue}
          onClick={() => onStartDialogue?.(selectedNode.id)}
          size="sm"
          title={onStartDialogue ? 'Start Socratic dialogue about this node' : 'Coming in Phase 3'}
          variant={onStartDialogue ? 'default' : 'outline'}
        >
          <MessageCircle className="h-4 w-4" />
          {onStartDialogue ? 'Start Dialogue' : 'Dialogue (Coming Soon)'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Get configuration for a node type
 */
function getNodeTypeConfig(type: NodeType): NodeTypeConfig {
  switch (type) {
    case 'root':
      return {
        color: 'text-violet-600 dark:text-violet-400',
        icon: <GitBranch className="h-4 w-4" />,
        label: 'Assumption',
      };
    case 'seed':
      return {
        color: 'text-primary',
        icon: <Sparkles className="h-4 w-4" />,
        label: 'Problem',
      };
    case 'soil':
      return {
        color: 'text-amber-600 dark:text-amber-400',
        icon: <Layers className="h-4 w-4" />,
        label: 'Context',
      };
    default:
      return {
        color: 'text-muted-foreground',
        icon: null,
        label: 'Node',
      };
  }
}
