'use client';

import { Lightbulb } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CANVAS_VALIDATION_LIMITS, seedSchema } from '@/lib/validation/canvas-schemas';

interface SeedStepProps {
  errors?: string[];
  onChange: (value: string) => void;
  onNext: () => void;
  value: string;
}

/**
 * SeedStep component for entering the main problem statement
 *
 * Features:
 * - Textarea input with character count
 * - Placeholder and helper text with examples
 * - Validation error display
 * - Next button with disabled state
 *
 * @param value - Current seed value
 * @param onChange - Callback when seed changes
 * @param onNext - Callback to proceed to next step
 * @param errors - Optional validation errors to display
 */
export function SeedStep({ errors, onChange, onNext, value }: SeedStepProps) {
  const [localErrors, setLocalErrors] = React.useState<string[]>([]);
  const trimmedLength = value.trim().length;
  const { SEED_MAX_LENGTH, SEED_MIN_LENGTH } = CANVAS_VALIDATION_LIMITS;

  // Validate on change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear errors when user starts typing
    if (localErrors.length > 0) {
      setLocalErrors([]);
    }
  };

  // Validate before proceeding
  const handleNext = () => {
    const result = seedSchema.safeParse(value);

    if (!result.success) {
      const errorMessages = result.error.issues.map((issue) => issue.message);
      setLocalErrors(errorMessages);
      return;
    }

    setLocalErrors([]);
    onNext();
  };

  const displayErrors = errors?.length ? errors : localErrors;
  const isValid = trimmedLength >= SEED_MIN_LENGTH && trimmedLength <= SEED_MAX_LENGTH;
  const charCountColor =
    trimmedLength < SEED_MIN_LENGTH
      ? 'text-muted-foreground'
      : trimmedLength > SEED_MAX_LENGTH
        ? 'text-destructive'
        : 'text-green-600 dark:text-green-500';

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">What problem are you exploring?</h2>
        <p className="text-muted-foreground text-sm">
          Describe the main challenge or question you want to think through. This becomes the
          &quot;seed&quot; of your thinking canvas.
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          aria-describedby="seed-helper seed-char-count"
          aria-invalid={displayErrors.length > 0}
          aria-label="Problem statement"
          className={cn(
            'min-h-[120px] resize-none',
            displayErrors.length > 0 && 'border-destructive'
          )}
          onChange={handleChange}
          placeholder="e.g., My team is burned out and productivity is declining..."
          value={value}
        />

        <div className="flex items-center justify-between text-sm">
          <span className={charCountColor} id="seed-char-count">
            {trimmedLength}/{SEED_MAX_LENGTH} characters
            {trimmedLength < SEED_MIN_LENGTH && ` (minimum ${SEED_MIN_LENGTH})`}
          </span>
        </div>

        {displayErrors.length > 0 && (
          <div className="space-y-1" role="alert">
            {displayErrors.map((error, index) => (
              <p className="text-sm text-destructive" key={index}>
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2"
        id="seed-helper"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <span>Tips for a good problem statement</span>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
          <li>Be specific about what&apos;s bothering you</li>
          <li>Focus on one main issue at a time</li>
          <li>Avoid jumping to solutions</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium">Examples:</span> &quot;I keep procrastinating on important
          tasks&quot; • &quot;Our team meetings feel unproductive&quot; • &quot;I&apos;m unsure
          which career path to choose&quot;
        </p>
      </div>

      <div className="flex justify-end">
        <Button disabled={!isValid} onClick={handleNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}
