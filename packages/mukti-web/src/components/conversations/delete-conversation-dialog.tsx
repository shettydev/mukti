'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteConversation } from '@/lib/hooks/use-conversations';

interface DeleteConversationDialogProps {
  conversationId: string;
  conversationTitle: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

/**
 * Confirmation dialog for deleting conversations
 *
 * Features:
 * - Clear warning message
 * - Shows conversation title for confirmation
 * - Loading state during deletion
 * - Automatic navigation after successful deletion
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param conversationId - ID of the conversation to delete
 * @param conversationTitle - Title of the conversation (for display)
 * @param onSuccess - Optional callback when deletion is successful
 */
export function DeleteConversationDialog({
  conversationId,
  conversationTitle,
  onOpenChange,
  onSuccess,
  open,
}: DeleteConversationDialogProps) {
  const deleteMutation = useDeleteConversation();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(conversationId);
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error is handled by the mutation's error state
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Conversation</DialogTitle>
              <DialogDescription>
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">&quot;{conversationTitle}&quot;</span>?
            All messages and history will be permanently removed.
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
            type="button"
            variant="destructive"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
