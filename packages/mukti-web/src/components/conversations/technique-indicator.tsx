'use client';

/**
 * TechniqueIndicator component
 *
 * Displays the currently selected Socratic technique near the input bar
 * in active conversations. Shows technique name with a tooltip containing
 * the full explanation.
 *
 */

import { HelpCircle } from 'lucide-react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TECHNIQUE_DESCRIPTIONS } from '@/lib/validation/conversation-schemas';

interface TechniqueIndicatorProps {
  className?: string;
  technique: SocraticTechnique;
}

/**
 * TechniqueIndicator component
 *
 * Displays the selected technique name with a tooltip showing the description.
 *
 * @param technique - The currently selected Socratic technique
 * @param className - Optional additional CSS classes
 */
export function TechniqueIndicator({ className, technique }: TechniqueIndicatorProps) {
  const techniqueInfo = TECHNIQUE_DESCRIPTIONS[technique];

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">Technique:</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex items-center gap-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            type="button"
          >
            <span className="text-xs font-semibold text-foreground">{techniqueInfo.name}</span>
            <HelpCircle className="h-3 w-3 text-muted-foreground transition-colors hover:text-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-64 bg-popover text-popover-foreground border"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold">{techniqueInfo.name}</p>
            <p className="text-xs text-muted-foreground">{techniqueInfo.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
