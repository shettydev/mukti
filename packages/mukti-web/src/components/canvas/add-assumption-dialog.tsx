'use client';

/**
 * AddAssumptionDialog component for Thinking Canvas
 *
 * Dialog for adding new assumptions (Root nodes) after initial setup.
 * Features:
 * - Form with text input and validation (5-200 chars)
 * - Shows current count and max limit (8)
 * - Validates input before submission
 *
 * @requirements 2.1, 2.2, 2.6
 */

import { Loader2, TreeDeciduous } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Maximum number of assumptions allowed per canvas session
 */
const MAX_ASSUMPTIONS = 8;

/**
 * Minimum character length for assumption text
 */
const MIN_LENGTH = 5;

/**
 * Maximum character length for assumption text
 */
const MAX_LENGTH = 200;

/**
 * Props for AddAssumptionDialog component
 * @property currentCount - Current number of assumptions in the canvas
 * @property maxCount - Maximum number of assumptions allowed (default: 8)
 * @property onConfirm - Handler called when user confirms assumption creation
 * @property onOpenChange - Handler for dialog open state changes
 * @property open - Whether the dialog is open
 */
export interface AddAssumptionDialogProps {
  currentCount: number;
  maxCount?: number;
  onConfirm: (assumption: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * AddAssumptionDialog - Dialog for adding new assumptions
 *
 * Allows users to add new assumptions (Root nodes) to their canvas
 * after the initial setup wizard. Enforces character limits and
 * maximum assumption count.
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Handler for dialog open state changes
 * @param onConfirm - Handler for confirming assumption creation
 * @param currentCount - Current number of assumptions
 * @param maxCount - Maximum allowed assumptions (default: 8)
 */
export function AddAssumptionDialog({
  currentCount,
  maxCount = MAX_ASSUMPTIONS,
  onConfirm,
  onOpenChange,
  open,
}: AddAssumptionDialogProps) {
  const [assumption, setAssumption] = useState('');
  const [error, setError] = useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAtLimit = currentCount >= maxCount;
  const remainingCount = maxCount - currentCount;
  const charCount = assumption.length;

  /**
   * Reset form state when dialog closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setAssumption('');
        setError(null);
        setIsSubmitting(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  /**
   * Validate assumption text
   */
  const validateAssumption = (text: string): null | string => {
    const trimmed = text.trim();

    if (!trimmed) {
      return 'Please enter an assumption';
    }

    if (trimmed.length < MIN_LENGTH) {
      return `Assumption must be at least ${MIN_LENGTH} characters`;
    }

    if (trimmed.length > MAX_LENGTH) {
      return `Assumption must be no more than ${MAX_LENGTH} characters`;
    }

    return null;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isAtLimit) {
        setError(`Maximum of ${maxCount} assumptions reached`);
        return;
      }

      const validationError = validateAssumption(assumption);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onConfirm(assumption.trim());
        handleOpenChange(false);
      } catch (err) {
        setError('Failed to add assumption. Please try again.');
        console.error('Failed to add assumption:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [assumption, isAtLimit, maxCount, onConfirm, handleOpenChange]
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAssumption(e.target.value);
    setError(null);
  }, []);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/20 p-1.5">
              <TreeDeciduous className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            Add Assumption
          </DialogTitle>
          <DialogDescription>
            Add a new assumption about your problem. Assumptions are beliefs you hold that may
            influence your thinking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Limit indicator (Requirement 2.6) */}
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {currentCount} of {maxCount} assumptions used
            </span>
            {isAtLimit ? (
              <span className="text-destructive font-medium">Limit reached</span>
            ) : (
              <span className="text-muted-foreground">{remainingCount} remaining</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isAtLimit ? 'bg-destructive' : 'bg-amber-500'
              )}
              style={{ width: `${(currentCount / maxCount) * 100}%` }}
            />
          </div>

          {/* Assumption input (Requirements 2.1, 2.2) */}
          <div className="space-y-2">
            <Label htmlFor="assumption-text">Assumption</Label>
            <Textarea
              autoFocus
              className={cn(
                'min-h-[100px] resize-none',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
              disabled={isAtLimit || isSubmitting}
              id="assumption-text"
              maxLength={MAX_LENGTH}
              onChange={handleInputChange}
              placeholder="What do you believe about this problem?"
              value={assumption}
            />
            <div className="flex items-center justify-between text-xs">
              {error ? (
                <p className="text-destructive">{error}</p>
              ) : (
                <p className="text-muted-foreground">
                  {MIN_LENGTH}-{MAX_LENGTH} characters
                </p>
              )}
              <span
                className={cn(
                  'text-muted-foreground',
                  charCount > MAX_LENGTH && 'text-destructive',
                  charCount >= MIN_LENGTH && charCount <= MAX_LENGTH && 'text-green-600'
                )}
              >
                {charCount}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isAtLimit || isSubmitting || charCount < MIN_LENGTH}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Assumption'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
