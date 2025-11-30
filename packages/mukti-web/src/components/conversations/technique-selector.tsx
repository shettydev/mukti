'use client';

import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  SOCRATIC_TECHNIQUES,
  TECHNIQUE_DESCRIPTIONS,
} from '@/lib/validation/conversation-schemas';

interface TechniqueSelectorProps {
  className?: string;
  disabled?: boolean;
  onChange: (technique: SocraticTechnique) => void;
  value?: SocraticTechnique;
}

/**
 * Technique selector component with descriptions
 *
 * Displays a dropdown-style selector that opens a dialog
 * showing all Socratic techniques with their descriptions.
 *
 * @param value - Currently selected technique
 * @param onChange - Callback when technique is selected
 * @param disabled - Whether the selector is disabled
 * @param className - Optional additional CSS classes
 */
export function TechniqueSelector({
  className,
  disabled = false,
  onChange,
  value,
}: TechniqueSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedTechnique = value ? TECHNIQUE_DESCRIPTIONS[value] : null;

  const handleSelect = (technique: SocraticTechnique) => {
    onChange(technique);
    setOpen(false);
  };

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Select Socratic technique"
        className={cn(
          'w-full justify-between font-normal',
          !value && 'text-muted-foreground',
          className
        )}
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <span className="truncate">
          {selectedTechnique ? selectedTechnique.name : 'Select a technique'}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Socratic Technique</DialogTitle>
            <DialogDescription>
              Choose a questioning methodology for your dialogue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {SOCRATIC_TECHNIQUES.map((technique) => {
              const info = TECHNIQUE_DESCRIPTIONS[technique];
              const isSelected = value === technique;

              return (
                <button
                  aria-selected={isSelected}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isSelected && 'border-primary bg-primary/5'
                  )}
                  key={technique}
                  onClick={() => handleSelect(technique)}
                  role="option"
                  type="button"
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-none">{info.name}</p>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
