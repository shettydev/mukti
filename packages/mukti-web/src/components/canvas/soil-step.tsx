'use client';

import { Layers, Plus, X } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  canAddSoilItem,
  CANVAS_VALIDATION_LIMITS,
  soilItemSchema,
} from '@/lib/validation/canvas-schemas';

interface SoilStepProps {
  errors?: string[];
  items: string[];
  onAdd: (item: string) => void;
  onBack: () => void;
  onNext: () => void;
  onRemove: (index: number) => void;
}

/**
 * SoilStep component for adding context and constraints
 *
 * Features:
 * - Input field for adding items
 * - Display list of added items with remove buttons
 * - Show item count (X/10)
 * - Helper text with examples
 * - Back and Next buttons
 *
 * @param items - Current array of soil items
 * @param onAdd - Callback to add a new item
 * @param onRemove - Callback to remove an item by index
 * @param onNext - Callback to proceed to next step
 * @param onBack - Callback to go back to previous step
 * @param errors - Optional validation errors to display
 */
export function SoilStep({ errors, items, onAdd, onBack, onNext, onRemove }: SoilStepProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [inputError, setInputError] = React.useState<null | string>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { SOIL_MAX_ITEMS } = CANVAS_VALIDATION_LIMITS;
  const canAdd = canAddSoilItem(items.length);

  const handleAddItem = () => {
    if (!inputValue.trim()) {
      return;
    }

    const result = soilItemSchema.safeParse(inputValue);

    if (!result.success) {
      setInputError(result.error.issues[0].message);
      return;
    }

    onAdd(result.data);
    setInputValue('');
    setInputError(null);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">What&apos;s the context?</h2>
        <p className="text-muted-foreground text-sm">
          Add the constraints, circumstances, and relevant context surrounding your problem. These
          form the &quot;soil&quot; in which your problem exists.
        </p>
      </div>

      {/* Input section */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              aria-describedby="soil-helper"
              aria-invalid={!!inputError}
              aria-label="Add context item"
              className={cn(inputError && 'border-destructive')}
              disabled={!canAdd}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Budget is limited to $5000"
              ref={inputRef}
              value={inputValue}
            />
          </div>
          <Button
            aria-label="Add context item"
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
            {items.length}/{SOIL_MAX_ITEMS} items
          </span>
          {!canAdd && <span className="text-amber-600">Maximum items reached</span>}
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Added context:</p>
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

      {errors && errors.length > 0 && (
        <div className="space-y-1" role="alert">
          {errors.map((error, index) => (
            <p className="text-sm text-destructive" key={index}>
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Helper section */}
      <div
        className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2"
        id="soil-helper"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers className="h-4 w-4 text-blue-500" />
          <span>What makes good context?</span>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
          <li>Time constraints or deadlines</li>
          <li>Budget or resource limitations</li>
          <li>People involved or affected</li>
          <li>Past attempts or relevant history</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium">Examples:</span> &quot;Deadline is in 2 weeks&quot; •
          &quot;Team of 5 people&quot; • &quot;Remote work environment&quot;
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button onClick={onBack} type="button" variant="outline">
          Back
        </Button>
        <Button onClick={onNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}
