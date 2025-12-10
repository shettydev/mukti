'use client';

/**
 * DeleteNodeDialog component for Thinking Canvas
 *
 * Dialog for confirming node deletion with cascade handling.
 * Features:
 * - Shows the node being deleted
 * - Displays dependent nodes that will be deleted
 * - Confirms deletion with cascade option
 *
 * @requirements 6.1, 6.4
 */

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { CanvasNode } from '@/types/canvas-visualization.types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Props for DeleteNodeDialog component
 * @property dependentNodes - Array of nodes that depend on the node being deleted
 * @property node - The node to be deleted
 * @property onConfirm - Handler called when user confirms deletion
 * @property onOpenChange - Handler for dialog open state changes
 * @property open - Whether the dialog is open
 */
export interface DeleteNodeDialogProps {
  dependentNodes: CanvasNode[];
  node: CanvasNode | null;
  onConfirm: (deleteDependents: boolean) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * DeleteNodeDialog - Dialog for confirming node deletion
 *
 * Allows users to delete nodes from the canvas with proper
 * confirmation and cascade handling for dependent nodes.
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Handler for dialog open state changes
 * @param node - The node to delete
 * @param dependentNodes - Nodes that depend on this node
 * @param onConfirm - Handler for confirming deletion
 */
export function DeleteNodeDialog({
  dependentNodes,
  node,
  onConfirm,
  onOpenChange,
  open,
}: DeleteNodeDialogProps) {
  const [deleteDependents, setDeleteDependents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const hasDependents = dependentNodes.length > 0;

  /**
   * Reset form state when dialog closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setDeleteDependents(true);
        setError(null);
        setIsSubmitting(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!node) {
        setError('No node selected for deletion');
        return;
      }

      // If there are dependents and user hasn't confirmed cascade, show error
      if (hasDependents && !deleteDependents) {
        setError('Cannot delete node without deleting dependent insights');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await onConfirm(deleteDependents);
        handleOpenChange(false);
      } catch (err) {
        setError('Failed to delete node. Please try again.');
        console.error('Failed to delete node:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [node, hasDependents, deleteDependents, onConfirm, handleOpenChange]
  );

  const totalDeletions = 1 + (deleteDependents ? dependentNodes.length : 0);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-destructive/20 p-1.5">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            Delete {node ? getNodeTypeName(node.type) : 'Node'}
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The node will be permanently removed from your canvas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Node being deleted (Requirement 6.1) */}
          {node && (
            <div className="mb-4 rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    getNodeTypeColor(node.type)
                  )}
                >
                  {getNodeTypeName(node.type)}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{node.data.label}</p>
            </div>
          )}

          {/* Dependent nodes warning (Requirement 6.4) */}
          {hasDependents && (
            <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
                    This node has {dependentNodes.length} dependent insight
                    {dependentNodes.length > 1 ? 's' : ''}
                  </p>
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5">
                    {dependentNodes.map((dependent) => (
                      <div
                        className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5 line-clamp-1"
                        key={dependent.id}
                      >
                        {dependent.data.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cascade delete checkbox */}
              <div className="mt-3 flex items-center space-x-2">
                <Checkbox
                  checked={deleteDependents}
                  id="delete-dependents"
                  onCheckedChange={(checked) => setDeleteDependents(checked === true)}
                />
                <Label
                  className="text-sm text-amber-600 dark:text-amber-400 cursor-pointer"
                  htmlFor="delete-dependents"
                >
                  Also delete dependent insights
                </Label>
              </div>
            </div>
          )}

          {/* Deletion summary */}
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive">
              {totalDeletions === 1 ? (
                <>You are about to delete 1 node.</>
              ) : (
                <>
                  You are about to delete {totalDeletions} nodes ({1} {getNodeTypeName(node?.type)}{' '}
                  + {dependentNodes.length} insight{dependentNodes.length > 1 ? 's' : ''}).
                </>
              )}
            </p>
          </div>

          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || (hasDependents && !deleteDependents)}
              type="submit"
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {totalDeletions > 1 ? `${totalDeletions} Nodes` : 'Node'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get color class for node type
 */
function getNodeTypeColor(type: string | undefined): string {
  switch (type) {
    case 'insight':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/20';
    case 'root':
      return 'text-amber-600 dark:text-amber-400 bg-amber-500/20';
    case 'seed':
      return 'text-violet-600 dark:text-violet-400 bg-violet-500/20';
    case 'soil':
      return 'text-blue-600 dark:text-blue-400 bg-blue-500/20';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

/**
 * Get display name for node type
 */
function getNodeTypeName(type: string | undefined): string {
  switch (type) {
    case 'insight':
      return 'Insight';
    case 'root':
      return 'Assumption';
    case 'seed':
      return 'Problem';
    case 'soil':
      return 'Context';
    default:
      return 'Node';
  }
}
