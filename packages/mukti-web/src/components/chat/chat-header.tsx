'use client';

import {
  Archive,
  ArchiveRestore,
  Loader2,
  Menu,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { Conversation } from '@/types/conversation.types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { conversationsApi } from '@/lib/api/conversations';
import { useDeleteConversation, useUpdateConversation } from '@/lib/hooks/use-conversations';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation?: Conversation | null;
  onMobileMenuToggle?: () => void;
}

/**
 * Chat header component with title and action menu
 *
 * Features:
 * - Displays conversation title or "New Chat" for empty state
 * - Mobile menu toggle button
 * - Dropdown menu with rename, archive, delete options
 * - Responsive design
 */
export function ChatHeader({ conversation, onMobileMenuToggle }: ChatHeaderProps) {
  const router = useRouter();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Mutations
  const { isPending: isDeleting, mutate: deleteConversation } = useDeleteConversation();
  const { mutate: updateConversation } = useUpdateConversation(conversation?.id || '');

  const isNewChat = !conversation;
  const title = conversation?.title || 'New Chat';

  // Handle rename dialog open
  const handleRenameOpen = useCallback(() => {
    setNewTitle(conversation?.title || '');
    setRenameDialogOpen(true);
  }, [conversation?.title]);

  // Handle rename submit
  const handleRenameSubmit = useCallback(() => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    updateConversation(
      { title: newTitle.trim() },
      {
        onError: () => {
          toast.error('Failed to rename conversation');
        },
        onSuccess: () => {
          toast.success('Conversation renamed');
          setRenameDialogOpen(false);
        },
      }
    );
  }, [newTitle, updateConversation]);

  // Handle archive/unarchive
  const handleArchive = useCallback(async () => {
    if (!conversation) {
      return;
    }

    try {
      await conversationsApi.update(conversation.id, {
        isArchived: !conversation.isArchived,
      });
      toast.success(conversation.isArchived ? 'Conversation restored' : 'Conversation archived');
      // Refresh the page to reflect changes
      router.refresh();
    } catch {
      toast.error('Failed to update conversation');
    }
  }, [conversation, router]);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(() => {
    if (!conversation) {
      return;
    }

    deleteConversation(conversation.id, {
      onError: () => {
        toast.error('Failed to delete conversation');
      },
      onSuccess: () => {
        toast.success('Conversation deleted');
        setDeleteDialogOpen(false);
        router.push('/chat');
      },
    });
  }, [conversation, deleteConversation, router]);

  return (
    <>
      <header
        className={cn(
          'flex items-center gap-2 px-3 py-2 md:px-4 md:py-3',
          'border-b border-white/10 bg-[#111111]',
          'min-h-[52px] md:min-h-[56px]'
        )}
      >
        {/* Mobile menu button */}
        {onMobileMenuToggle && (
          <Button
            aria-label="Open navigation menu"
            className="md:hidden min-h-[40px] min-w-[40px]"
            onClick={onMobileMenuToggle}
            size="icon"
            variant="ghost"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1
            className={cn(
              'text-sm md:text-base font-semibold truncate',
              isNewChat && 'text-white/60'
            )}
            title={title}
          >
            {title}
          </h1>
          {conversation?.isArchived && (
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Archive className="w-3 h-3" />
              Archived
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Options menu (only for existing conversations) */}
          {!isNewChat && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Conversation options"
                  className="h-8 w-8"
                  size="icon"
                  variant="ghost"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleRenameOpen}>
                  <Pencil className="w-4 h-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleArchive}>
                  {conversation?.isArchived ? (
                    <>
                      <ArchiveRestore className="w-4 h-4" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Rename Dialog */}
      <Dialog onOpenChange={setRenameDialogOpen} open={renameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Enter a new title for this conversation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="chat-title">Title</Label>
              <Input
                id="chat-title"
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                placeholder="Enter conversation title"
                value={newTitle}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRenameDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{conversation?.title}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={isDeleting} onClick={handleDeleteConfirm} variant="destructive">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
