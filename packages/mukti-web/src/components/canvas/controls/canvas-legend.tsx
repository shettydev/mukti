'use client';

/**
 * CanvasLegend component for Thinking Canvas
 *
 * Displays a color key explaining the different node types
 * and shows exploration status indicators.
 *
 * @requirements 6.4, 8.5
 */

import { CheckCircle2, GitBranch, Layers, Lightbulb, MessageCircle, Sparkles } from 'lucide-react';

import type { CanvasLegendProps } from '@/types/canvas-visualization.types';

import { cn } from '@/lib/utils';

/**
 * Legend item configuration
 */
interface LegendItem {
  color: string;
  description: string;
  icon: React.ReactNode;
  label: string;
}

/**
 * Node type legend items
 */
const NODE_LEGEND_ITEMS: LegendItem[] = [
  {
    color: 'bg-primary/20 border-primary/40',
    description: 'Central problem statement',
    icon: <Sparkles className="h-3.5 w-3.5 text-primary" />,
    label: 'Problem (Seed)',
  },
  {
    color: 'bg-amber-500/20 border-amber-500/40',
    description: 'Context and constraints',
    icon: <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
    label: 'Context (Soil)',
  },
  {
    color: 'bg-violet-500/20 border-violet-500/40',
    description: 'Assumptions to examine',
    icon: <GitBranch className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />,
    label: 'Assumption (Root)',
  },
  {
    color: 'bg-emerald-500/20 border-emerald-500/40',
    description: 'Discoveries from dialogue',
    icon: <Lightbulb className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
    label: 'Insight',
  },
];

/**
 * Exploration status legend items
 */
const EXPLORATION_LEGEND_ITEMS: LegendItem[] = [
  {
    color: 'bg-green-500/20',
    description: 'Node has been explored through dialogue',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />,
    label: 'Explored',
  },
  {
    color: 'bg-muted/50',
    description: 'Number of messages in dialogue',
    icon: <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />,
    label: 'Message count',
  },
];

/**
 * CanvasLegend - Node type color key
 *
 * Displays a legend explaining the meaning of different node colors
 * and icons. Shows exploration status indicators when enabled.
 *
 * @param showExplorationStatus - Whether to show exploration status legend
 */
export function CanvasLegend({ showExplorationStatus = true }: CanvasLegendProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-background/95 p-3',
        'shadow-md backdrop-blur-sm'
      )}
    >
      {/* Legend title */}
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Node Types
      </span>

      {/* Node type items */}
      <div className="flex flex-col gap-1.5">
        {NODE_LEGEND_ITEMS.map((item) => (
          <div className="flex items-center gap-2" key={item.label} title={item.description}>
            <div
              className={cn('flex h-6 w-6 items-center justify-center rounded border', item.color)}
            >
              {item.icon}
            </div>
            <span className="text-xs text-foreground/80">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Exploration status indicators */}
      {showExplorationStatus && (
        <>
          <div className="my-1 h-px bg-border" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Exploration Status
          </span>
          <div className="flex flex-col gap-1.5">
            {EXPLORATION_LEGEND_ITEMS.map((item) => (
              <div className="flex items-center gap-2" key={item.label} title={item.description}>
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full',
                    item.color
                  )}
                >
                  {item.icon}
                </div>
                <span className="text-xs text-foreground/80">{item.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
