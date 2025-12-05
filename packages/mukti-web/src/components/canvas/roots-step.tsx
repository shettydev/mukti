'use client';

import { Plus, TreeDeciduous, X } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  canAddRootsItem,
  CANVAS_VALIDATION_LIMITS,
  hasMinimumRoots,
  rootsItemSchema,
} from '@/lib/validation/canvas-schemas';

interface RootsStepProps {
  errors?: string[];
  items: string[];
  onAdd: (item: string) => void;
  onBack: () => void;
  onNext: () => void;
  onRemove: (index: number) => void;
}

/**
 * RootsStep component for adding core assumptions
 *
 * Features:
 * - Input field for adding assumptions
 * - Display list of added assumptions with remove buttons
 * - Show item count (X/8)
 * - Helper text explaining value of identifying assumptions
 * - Back and Next buttons with validation (min 1 required)
 *
 * @param items - Current array of roots items (assumptions)
 * @param onAdd - Callback to add a new item
 * @param onRemove - Callback to remove an item by index
 * @param onNext - Callback to proceed to next step
 * @param onBack - Callback to go back to previous step
 * @param errors - Optional validation errors to display
 */
export function RootsStep({ errors, items, onAdd, onBack, onNext, onRemove }: RootsStepProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [inputError, setInputError] = React.useState<null | string>(null);
  const [validationError, setValidationError] = React.useState<null | string>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { ROOTS_MAX_ITEMS, ROOTS_MIN_ITEMS } = CANVAS_VALIDATION_LIMITS;
  const canAdd = canAddRootsItem(items.length);
  const hasMinimum = hasMinimumRoots(items.length);

  const handleAddItem = () => {
    if (!inputValue.trim()) {
      return;
    }

    const result = rootsItemSchema.safeParse(inputValue);

    if (!result.success) {
      setInputError(result.error.issues[0].message);
      return;
    }

    onAdd(result.data);
    setInputValue('');
    setInputError(null);
    setValidationError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (inputError) {
      setInputError(null);
    }
  };

  const handleNext = () => {
    if (!hasMinimum) {
      setValidationError(`At least ${ROOTS_MIN_ITEMS} assumption is required`);
      return;
    }
    setValidationError(null);
    onNext();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">What are you assuming?</h2>
        <p className="text-muted-foreground text-sm">
          Identify the beliefs and assumptions you hold about this problem. These are the
          &quot;roots&quot; that shape how you see the situation — and they&apos;re often worth
          questioning.
        </p>
      </div>

      {/* Input section */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              aria-describedby="roots-helper"
              aria-invalid={!!inputError}
              aria-label="Add assumption"
              className={cn(inputError && 'border-destructive')}
              disabled={!canAdd}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g., We need to hire more people"
              ref={inputRef}
              value={inputValue}
            />
          </div>
          <Button
            aria-label="Add assumption"
            disabled={!canAdd || !inputValue.trim()}
            onClick={handleAddItem}
            size="icon"
            type="button"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {inputError && (
          <p className="text-sm text-destructive" role="alert">
            {inputError}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {items.length}/{ROOTS_MAX_ITEMS} items
            {!hasMinimum && (
              <span className="text-amber-600 ml-2">(minimum {ROOTS_MIN_ITEMS} required)</span>
            )}
          </span>
          {!canAdd && <span className="text-amber-600">Maximum items reached</span>}
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Your assumptions:</p>
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <Badge className="gap-1 pr-1 py-1.5 max-w-full" key={index} variant="secondary">
                <span className="truncate">{item}</span>
                <button
                  aria-label={`Remove "${item}"`}
                  className="ml-1 rounded-full hover:bg-secondary-foreground/20 p-0.5 flex-shrink-0"
                  onClick={() => onRemove(index)}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(validationError || (errors && errors.length > 0)) && (
        <div className="space-y-1" role="alert">
          {validationError && <p className="text-sm text-destructive">{validationError}</p>}
          {errors?.map((error, index) => (
            <p className="text-sm text-destructive" key={index}>
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Helper section */}
      <div
        className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2"
        id="roots-helper"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <TreeDeciduous className="h-4 w-4 text-green-600" />
          <span>Why identify assumptions?</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Our assumptions often go unexamined, yet they shape how we see problems and solutions. By
          making them explicit, we can question whether they&apos;re actually true — and discover
          new possibilities.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
          <li>What do you believe must be true?</li>
          <li>What solutions have you already ruled out?</li>
          <li>What would others assume about this situation?</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium">Examples:</span> &quot;The problem is with the team&quot; •
          &quot;We don&apos;t have enough time&quot; • &quot;This approach won&apos;t work&quot;
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button disabled={!hasMinimum} onClick={handleNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}
