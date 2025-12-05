'use client';

/**
 * InsightNodeDialog component for Thinking Canvas
 *
 * Dialog for creating new insight nodes from dialogue discoveries.
 * Features:
 * - Form for insight label input
 * - Shows parent node context
 * - Validation for non-empty label
 *
 * @requirements 3.1, 3.2
 */

import { Lightbulb } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Props for InsightNodeDialog component
 * @property open - Whether the dialog is open
 * @property onOpenChange - Handler for dialog open state changes
 * @property parentNode - The parent node from which the insight is being created
 * @property onConfirm - Handler called when user confirms insight creation
 */
export interface InsightNodeDialogProps {
  onConfirm: (label: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  parentNode: CanvasNode | null;
}

/**
 * InsightNodeDialog - Dialog for creating insight nodes
 *
 * Allows users to capture discoveries from dialogue as new nodes
 * that connect to the parent node being discussed.
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Handler for dialog open state changes
 * @param parentNode - The parent node context
 * @param onConfirm - Handler for confirming insight creation
 */
export function InsightNodeDialog({
  onConfirm,
  onOpenChange,
  open,
  parentNode,
}: InsightNodeDialogProps) {
  const [label, setLabel] = useState('');
  const [error, setError] = useState<null | string>(null);

  /**
   * Reset form state when dialog closes
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setLabel('');
        setError(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedLabel = label.trim();

      if (!trimmedLabel) {
        setError('Please enter a label for your insight');
        return;
      }

      onConfirm(trimmedLabel);
      handleOpenChange(false);
    },
    [label, onConfirm, handleOpenChange]
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
    setError(null);
  }, []);

  /**
   * Get parent node type label for display
   */
  const getParentTypeLabel = (type: string | undefined): string => {
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
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/20 p-1.5">
              <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Create Insight
          </DialogTitle>
          <DialogDescription>
            Capture a discovery or realization from your dialogue as a new node.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Parent node context (Requirement 3.2) */}
          {parentNode && (
            <div className="mb-4 rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Connected to {getParentTypeLabel(parentNode.type)}:
              </p>
              <p className="text-sm text-foreground line-clamp-2">{parentNode.data.label}</p>
            </div>
          )}

          {/* Insight label input (Requirement 3.1) */}
          <div className="space-y-2">
            <Label htmlFor="insight-label">Insight</Label>
            <Input
              autoFocus
              className={cn(error && 'border-destructive')}
              id="insight-label"
              onChange={handleInputChange}
              placeholder="What did you discover?"
              value={label}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button onClick={() => handleOpenChange(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!label.trim()}
              type="submit"
            >
              Create Insight
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
