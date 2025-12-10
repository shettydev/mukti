'use client';

/**
 * LinkConstraintDialog component for Thinking Canvas
 *
 * Dialog for linking assumptions (Root nodes) to constraints (Soil nodes).
 * Features:
 * - Displays available constraints for selection
 * - Shows already linked constraints as disabled
 * - Creates relationship edges between nodes
 *
 * @requirements 3.1, 3.2
 */

import { Check, Link2, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { CanvasNode } from '@/types/canvas-visualization.types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Props for LinkConstraintDialog component
 * @property availableConstraints - Array of Soil nodes available for linking
 * @property existingLinks - Array of constraint node IDs already linked to the source
 * @property onConfirm - Handler called when user confirms the link
 * @property onOpenChange - Handler for dialog open state changes
 * @property open - Whether the dialog is open
 * @property sourceNode - The assumption (Root) node being linked
 */
export interface LinkConstraintDialogProps {
  availableConstraints: CanvasNode[];
  existingLinks: string[];
  onConfirm: (constraintNodeId: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sourceNode: CanvasNode | null;
}

/**
 * LinkConstraintDialog - Dialog for linking assumptions to constraints
 *
 * Allows users to create relationship edges between assumption (Root)
 * nodes and constraint (Soil) nodes. Shows which constraints are
 * already linked and prevents duplicate links.
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Handler for dialog open state changes
 * @param sourceNode - The assumption node being linked
 * @param availableConstraints - Available constraint nodes
 * @param existingLinks - Already linked constraint IDs
 * @param onConfirm - Handler for confirming the link
 */
export function LinkConstraintDialog({
  availableConstraints,
  existingLinks,
  onConfirm,
  onOpenChange,
  open,
  sourceNode,
}: LinkConstraintDialogProps) {
  const [selectedConstraintId, setSelectedConstraintId] = useState<null | string>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const hasAvailableConstraints = availableConstraints.some((c) => !existingLinks.includes(c.id));

  /**
   * Reset form state when dialog closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedConstraintId(null);
        setError(null);
        setIsSubmitting(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  /**
   * Handle constraint selection
   */
  const handleSelectConstraint = useCallback((constraintId: string) => {
    setSelectedConstraintId(constraintId);
    setError(null);
  }, []);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedConstraintId) {
        setError('Please select a constraint to link');
        return;
      }

      if (existingLinks.includes(selectedConstraintId)) {
        setError('This constraint is already linked');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onConfirm(selectedConstraintId);
        handleOpenChange(false);
      } catch (err) {
        setError('Failed to create link. Please try again.');
        console.error('Failed to create relationship:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedConstraintId, existingLinks, onConfirm, handleOpenChange]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-500/20 p-1.5">
              <Link2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            Link to Constraint
          </DialogTitle>
          <DialogDescription>
            Connect this assumption to a constraint to show how they relate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Source node context (Requirement 3.1) */}
          {sourceNode && (
            <div className="mb-4 rounded-lg border bg-amber-500/10 border-amber-500/30 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                Linking Assumption:
              </p>
              <p className="text-sm text-foreground line-clamp-2">{sourceNode.data.label}</p>
            </div>
          )}

          {/* Constraint selection (Requirement 3.2) */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Select a constraint:</p>

            {availableConstraints.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No constraints available. Add context items first.
                </p>
              </div>
            ) : !hasAvailableConstraints ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  All constraints are already linked to this assumption.
                </p>
              </div>
            ) : (
              <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                {availableConstraints.map((constraint) => {
                  const isLinked = existingLinks.includes(constraint.id);
                  const isSelected = selectedConstraintId === constraint.id;

                  return (
                    <button
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-all',
                        'hover:border-blue-500/50 hover:bg-blue-500/5',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                        isSelected && 'border-blue-500 bg-blue-500/10',
                        isLinked &&
                          'opacity-50 cursor-not-allowed hover:border-border hover:bg-transparent'
                      )}
                      disabled={isLinked || isSubmitting}
                      key={constraint.id}
                      onClick={() => handleSelectConstraint(constraint.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-2">
                            {constraint.data.label}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {isLinked ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Check className="h-3 w-3" />
                              <span>Linked</span>
                            </div>
                          ) : isSelected ? (
                            <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
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
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!selectedConstraintId || isSubmitting || !hasAvailableConstraints}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                'Create Link'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
