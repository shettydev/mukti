'use client';

import { Archive, ArchiveRestore, Loader2, MoreHorizontal, PanelLeft, Trash2 } from 'lucide-react';
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
      {/* Floating header with gradient fade */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none h-16 md:h-20">
        {/* Gradient background - fades from solid to transparent */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] from-40% via-[#050505]/60 via-70% to-transparent" />

        {/* Header content */}
        <div className="relative flex items-center justify-between p-2 md:p-3">
          {/* Left side - Sidebar toggle + Title */}
          <div className="flex items-center gap-2 pointer-events-auto min-w-0">
            {/* Sidebar toggle */}
            {onMobileMenuToggle && (
              <Button
                aria-label="Toggle sidebar"
                className={cn(
                  'h-8 w-8 shrink-0',
                  'md:hidden', // Hide on desktop
                  'bg-transparent hover:bg-white/5',
                  'text-white/50 hover:text-white/80',
                  'transition-all duration-200',
                  'focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#050505]',
                  'active:scale-95'
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
                'text-sm font-medium truncate',
                isNewChat ? 'text-white/40' : 'text-white/70'
              )}
              title={title}
            >
              {title}
            </h1>

            {/* Archived badge */}
            {conversation?.isArchived && (
              <span className="shrink-0 text-[10px] text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Archived
              </span>
            )}
          </div>

          {/* Right side - Options */}
          {!isNewChat && (
            <div className="pointer-events-auto">
              <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    aria-label="More options"
                    className={cn(
                      'h-8 w-8',
                      'bg-transparent hover:bg-white/5',
                      'text-white/50 hover:text-white/80',
                      'transition-all duration-200',
                      'focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[#050505]',
                      'active:scale-95',
                      popoverOpen && 'bg-white/5 text-white/80'
                    )}
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-48 p-1 bg-[#1a1a1a] border-white/10"
                  sideOffset={8}
                >
                  {/* Archive/Restore option */}
                  <button
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                      'text-white/70 hover:text-white hover:bg-white/5',
                      'transition-all duration-150 cursor-pointer',
                      'focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-inset',
                      'active:scale-[0.98]'
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
                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                      'text-red-400 hover:text-red-300 hover:bg-red-500/10',
                      'transition-all duration-150 cursor-pointer',
                      'focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:ring-inset',
                      'active:scale-[0.98]'
                    )}
                    onClick={handleDeleteClick}
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#1a1a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete conversation?</DialogTitle>
            <DialogDescription className="text-white/50">
              This will permanently delete &quot;{conversation?.title}&quot;. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              className="bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95"
              onClick={() => setDeleteDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600 transition-all duration-200 active:scale-95"
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
