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
import { SOCRATIC_TECHNIQUES, TECHNIQUE_DESCRIPTIONS } from '@/lib/validation/conversation-schemas';

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
          'h-11 w-full justify-between border-japandi-sand/80 bg-japandi-cream/70 text-japandi-stone font-normal hover:bg-japandi-light-stone/70',
          'focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/35',
          !value && 'text-japandi-stone/60',
          className
        )}
        disabled={disabled}
        id="technique-selector"
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
        <DialogContent className="sm:max-w-lg border-japandi-sand/80 !bg-japandi-cream text-japandi-stone shadow-2xl opacity-100">
          <DialogHeader>
            <DialogTitle>Select Socratic Technique</DialogTitle>
            <DialogDescription className="text-japandi-stone/70">
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
                    'border-japandi-sand/70 hover:bg-japandi-light-stone/70',
                    'focus:outline-none focus:ring-2 focus:ring-japandi-sage/35',
                    isSelected && 'border-japandi-sage bg-japandi-sage/10'
                  )}
                  key={technique}
                  onClick={() => handleSelect(technique)}
                  role="option"
                  type="button"
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-japandi-sage bg-japandi-sage text-white'
                        : 'border-japandi-sand'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-none">{info.name}</p>
                    <p className="text-sm text-japandi-stone/65">{info.description}</p>
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
