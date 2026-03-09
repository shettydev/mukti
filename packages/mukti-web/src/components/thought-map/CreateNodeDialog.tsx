'use client';

/**
 * CreateNodeDialog component for Thought Map
 *
 * Modal dialog for adding a new branch/leaf node to the Thought Map.
 * Collects the node label from the user and calls the store's addNode action.
 *
 * Features:
 * - Radix-powered Dialog (via shared ui/dialog component)
 * - Label input with validation (non-empty, max 120 chars)
 * - Calls store `addNode` with mapId + label + parentNodeId
 * - Sonner toast on success and error
 * - Loading spinner (Loader2) during async call
 * - Japandi aesthetic: warm stone tones, minimal
 */

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
import { useThoughtMapActions } from '@/lib/stores/thought-map-store';

// ============================================================================
// Types
// ============================================================================

export interface CreateNodeDialogProps {
  /** Optional additional className for the outer wrapper */
  className?: string;
  /** ID of the Thought Map to add the node to */
  mapId: string;
  /** Called when the dialog should close */
  onClose: () => void;
  /** Called after a node is successfully created (receives the new nodeId) */
  onCreated?: (nodeId: string) => void;
  /** Whether the dialog is open */
  open: boolean;
  /** Human-readable label of the parent node (for context in the dialog heading) */
  parentLabel?: string;
  /** nodeId of the parent node */
  parentNodeId: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_LABEL_LENGTH = 120;

// ============================================================================
// Component
// ============================================================================

/**
 * CreateNodeDialog - Modal form for adding a new node to the Thought Map
 *
 * Validates the label client-side, then calls `addNode` from the store.
 * Shows a Sonner toast on success or failure and resets the form on close.
 *
 * @param open - Controls dialog visibility
 * @param mapId - The active thought map ID
 * @param parentNodeId - The nodeId to attach the new node to
 * @param parentLabel - Display label of the parent (shown in dialog subtitle)
 * @param onClose - Called to close the dialog
 * @param onCreated - Optional callback after successful creation
 */
export function CreateNodeDialog({
  mapId,
  onClose,
  onCreated,
  open,
  parentLabel,
  parentNodeId,
}: CreateNodeDialogProps) {
  const { addNode } = useThoughtMapActions();

  const [label, setLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form whenever dialog opens/closes
  useEffect(() => {
    if (open) {
      setLabel('');
      setError(null);
      setIsSubmitting(false);
      // Auto-focus input on next frame
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value.slice(0, MAX_LABEL_LENGTH));
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = label.trim();
      if (!trimmed) {
        setError('Please enter a label for this branch.');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const newNodeId = await addNode({
        label: trimmed,
        mapId,
        parentNodeId,
      });

      setIsSubmitting(false);

      if (newNodeId) {
        toast.success('Branch added', { description: `"${trimmed}" added to the map.` });
        onClose();
        onCreated?.(newNodeId);
      } else {
        setError('Failed to add the branch. Please try again.');
        toast.error('Failed to add branch', { description: 'Something went wrong.' });
      }
    },
    [addNode, label, mapId, onClose, onCreated, parentNodeId]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !isSubmitting) {
        onClose();
      }
    },
    [isSubmitting, onClose]
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Branch</DialogTitle>
          <DialogDescription>
            {parentLabel
              ? `Add a new thought branching off "${parentLabel}".`
              : 'Add a new branch to the thought map.'}
          </DialogDescription>
        </DialogHeader>

        <form id="create-node-form" onSubmit={handleSubmit}>
          <div className="space-y-2 py-2">
            <Label htmlFor="node-label">
              Label
              <span className="ml-1 text-stone-400 dark:text-stone-500">
                ({label.length}/{MAX_LABEL_LENGTH})
              </span>
            </Label>
            <Input
              autoComplete="off"
              className="w-full"
              disabled={isSubmitting}
              id="node-label"
              maxLength={MAX_LABEL_LENGTH}
              onChange={handleLabelChange}
              placeholder="e.g. Underlying assumptions..."
              ref={inputRef}
              value={label}
            />
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={isSubmitting || !label.trim()} form="create-node-form" type="submit">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding…
              </>
            ) : (
              'Add Branch'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
