'use client';

import { Archive, ArchiveRestore, Loader2, MoreHorizontal, PanelLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { Conversation } from '@/types/conversation.types';

import { JapandiThemeToggle } from '@/components/theme/japandi-theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { conversationsApi } from '@/lib/api/conversations';
import { useDeleteConversation } from '@/lib/hooks/use-conversations';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  conversation?: Conversation | null;
  onMobileMenuToggle?: () => void;
}

/**
 * Minimal chat header with sidebar toggle, title, and options popover
 *
 * Layout:
 * - Left: Sidebar toggle + Chat title
 * - Right: Options popover (archive, delete)
 */
export function ChatHeader({ conversation, onMobileMenuToggle }: ChatHeaderProps) {
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { isPending: isDeleting, mutate: deleteConversation } = useDeleteConversation();

  const isNewChat = !conversation;
  const title = conversation?.title || 'New Chat';

  // Handle archive/unarchive
  const handleArchive = useCallback(async () => {
    if (!conversation) {
      return;
    }

    setPopoverOpen(false);

    try {
      await conversationsApi.update(conversation.id, {
        isArchived: !conversation.isArchived,
      });
      toast.success(conversation.isArchived ? 'Conversation restored' : 'Conversation archived');
      router.refresh();
    } catch {
      toast.error('Failed to update conversation');
    }
  }, [conversation, router]);

  // Handle delete
  const handleDeleteClick = useCallback(() => {
    setPopoverOpen(false);
    setDeleteDialogOpen(true);
  }, []);

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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-2 pt-2 md:px-4 md:pt-3">
        <div className="pointer-events-auto flex items-center justify-between rounded-2xl border border-japandi-sand/70 bg-japandi-cream/80 px-2 py-2 shadow-sm backdrop-blur-sm md:px-3">
          {/* Left side - Sidebar toggle + Title */}
          <div className="flex min-w-0 items-center gap-2">
            {/* Sidebar toggle */}
            {onMobileMenuToggle && (
              <Button
                aria-label="Toggle sidebar"
                className={cn(
                  'h-8 w-8 shrink-0 text-japandi-stone/75',
                  'md:hidden', // Hide on desktop
                  'bg-transparent hover:bg-japandi-light-stone/75',
                  'transition-colors duration-200'
                )}
                onClick={onMobileMenuToggle}
                size="icon"
                variant="ghost"
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
            )}

            {/* Title */}
            <h1
              className={cn(
                'truncate text-sm font-medium tracking-wide',
                isNewChat ? 'text-japandi-stone/45' : 'text-japandi-stone/80'
              )}
              title={title}
            >
              {title}
            </h1>

            {/* Archived badge */}
            {conversation?.isArchived && (
              <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                Archived
              </span>
            )}
          </div>

          {/* Right side - Options */}
          <div className="flex items-center gap-1">
            <JapandiThemeToggle
              ariaLabel="Toggle theme in chat"
              buttonClassName="h-8 w-8 border-japandi-sand/70 bg-japandi-cream/60"
            />
            {!isNewChat && (
              <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-label="More options"
                    className={cn(
                      'h-8 w-8',
                      'bg-transparent hover:bg-japandi-light-stone/75',
                      'text-japandi-stone/70 hover:text-japandi-stone',
                      'transition-colors duration-200',
                      popoverOpen && 'bg-japandi-light-stone/75 text-japandi-stone'
                    )}
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-48 border-japandi-sand/80 bg-japandi-cream p-1 text-japandi-stone"
                  sideOffset={8}
                >
                  {/* Archive/Restore option */}
                  <button
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                      'text-japandi-stone/80 hover:bg-japandi-light-stone/75 hover:text-japandi-stone',
                      'transition-colors duration-150 cursor-pointer'
                    )}
                    onClick={handleArchive}
                    type="button"
                  >
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
                  </button>

                  {/* Delete option */}
                  <button
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
                      'text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200',
                      'transition-colors duration-150 cursor-pointer'
                    )}
                    onClick={handleDeleteClick}
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-japandi-sand/80 bg-japandi-cream text-japandi-stone">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription className="text-japandi-stone/70">
              This will permanently delete &quot;{conversation?.title}&quot;. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              className="border-japandi-sand/80 bg-japandi-cream text-japandi-stone hover:bg-japandi-light-stone/75"
              onClick={() => setDeleteDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
