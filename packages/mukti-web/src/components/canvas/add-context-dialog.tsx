'use client';

/**
 * AddContextDialog component for Thinking Canvas
 *
 * Dialog for adding new context items (Soil nodes) after initial setup.
 * Features:
 * - Form with text input and validation (5-200 chars)
 * - Shows current count and max limit (10)
 * - Validates input before submission
 *
 * @requirements 5.1, 5.2, 5.6
 */

import { Layers, Loader2 } from 'lucide-react';
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
 * Maximum number of context items allowed per canvas session
 */
const MAX_CONTEXT = 10;

/**
 * Minimum character length for context text
 */
const MIN_LENGTH = 5;

/**
 * Maximum character length for context text
 */
const MAX_LENGTH = 200;

/**
 * Props for AddContextDialog component
 * @property currentCount - Current number of context items in the canvas
 * @property maxCount - Maximum number of context items allowed (default: 10)
 * @property onConfirm - Handler called when user confirms context creation
 * @property onOpenChange - Handler for dialog open state changes
 * @property open - Whether the dialog is open
 */
export interface AddContextDialogProps {
  currentCount: number;
  maxCount?: number;
  onConfirm: (context: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * AddContextDialog - Dialog for adding new context items
 *
 * Allows users to add new context/constraints (Soil nodes) to their canvas
 * after the initial setup wizard. Enforces character limits and
 * maximum context count.
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Handler for dialog open state changes
 * @param onConfirm - Handler for confirming context creation
 * @param currentCount - Current number of context items
 * @param maxCount - Maximum allowed context items (default: 10)
 */
export function AddContextDialog({
  currentCount,
  maxCount = MAX_CONTEXT,
  onConfirm,
  onOpenChange,
  open,
}: AddContextDialogProps) {
  const [context, setContext] = useState('');
  const [error, setError] = useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAtLimit = currentCount >= maxCount;
  const remainingCount = maxCount - currentCount;
  const charCount = context.length;

  /**
   * Reset form state when dialog closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setContext('');
        setError(null);
        setIsSubmitting(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  /**
   * Validate context text
   */
  const validateContext = (text: string): null | string => {
    const trimmed = text.trim();

    if (!trimmed) {
      return 'Please enter a context item';
    }

    if (trimmed.length < MIN_LENGTH) {
      return `Context must be at least ${MIN_LENGTH} characters`;
    }

    if (trimmed.length > MAX_LENGTH) {
      return `Context must be no more than ${MAX_LENGTH} characters`;
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
        setError(`Maximum of ${maxCount} context items reached`);
        return;
      }

      const validationError = validateContext(context);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onConfirm(context.trim());
        handleOpenChange(false);
      } catch (err) {
        setError('Failed to add context. Please try again.');
        console.error('Failed to add context:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [context, isAtLimit, maxCount, onConfirm, handleOpenChange]
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContext(e.target.value);
    setError(null);
  }, []);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-500/20 p-1.5">
              <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            Add Context
          </DialogTitle>
          <DialogDescription>
            Add a new context item or constraint. Context represents the environment, limitations,
            or circumstances surrounding your problem.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Limit indicator (Requirement 5.6) */}
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {currentCount} of {maxCount} context items used
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
                isAtLimit ? 'bg-destructive' : 'bg-blue-500'
              )}
              style={{ width: `${(currentCount / maxCount) * 100}%` }}
            />
          </div>

          {/* Context input (Requirements 5.1, 5.2) */}
          <div className="space-y-2">
            <Label htmlFor="context-text">Context / Constraint</Label>
            <Textarea
              autoFocus
              className={cn(
                'min-h-[100px] resize-none',
                error && 'border-destructive focus-visible:ring-destructive'
              )}
              disabled={isAtLimit || isSubmitting}
              id="context-text"
              maxLength={MAX_LENGTH}
              onChange={handleInputChange}
              placeholder="What constraints or circumstances affect this problem?"
              value={context}
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isAtLimit || isSubmitting || charCount < MIN_LENGTH}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Context'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
