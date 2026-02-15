'use client';

import { Archive, ArchiveRestore, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Conversation } from '@/types/conversation.types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import {
  useDeleteConversation,
  useInfiniteConversations,
  useUpdateConversation,
} from '@/lib/hooks/use-conversations';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time-formatting';

/**
 * Individual conversation item in the list
 */
interface ConversationItemProps {
  active: boolean;
  collapsed: boolean;
  conversation: Conversation;
  onArchive: (id: string, isArchived: boolean) => void;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
}

interface ConversationListProps {
  /** ID of the currently active conversation */
  activeConversationId?: string;
  /** Whether the sidebar is collapsed */
  collapsed: boolean;
  /** Callback when a conversation is clicked */
  onConversationClick?: (id: string) => void;
}

/**
 * Infinite scroll list of conversations in the sidebar
 *
 * Features:
 * - Infinite scroll with automatic loading
 * - Active conversation highlighting
 * - Truncated titles with tooltips
 * - Last activity timestamps
 * - Sorted by last activity (newest first)
 * - Context menu with rename, archive, delete options
 * - Toggle to show/hide archived conversations
 */
export function ConversationList({
  activeConversationId,
  collapsed,
  onConversationClick,
}: ConversationListProps) {
  const router = useRouter();
  const params = useParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State for showing archived conversations
  const [showArchived, setShowArchived] = useState(false);

  // State for rename dialog
  const [renameDialog, setRenameDialog] = useState<{
    id: string;
    open: boolean;
    title: string;
  }>({ id: '', open: false, title: '' });

  // State for delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    id: string;
    open: boolean;
    title: string;
  }>({ id: '', open: false, title: '' });

  // Get active conversation ID from URL if not provided
  const activeId = activeConversationId || (params?.id as string);

  // Fetch conversations with infinite scroll, sorted by last activity
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteConversations({
      isArchived: showArchived ? true : undefined,
      sort: 'updatedAt',
    });

  // Mutations
  const { isPending: isDeleting, mutate: deleteConversation } = useDeleteConversation();
  const { mutate: updateConversation } = useUpdateConversation(renameDialog.id);

  // Flatten all pages into a single array
  const conversations = data?.pages.flatMap((page) => page.data) ?? [];

  // Handle scroll for infinite loading
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { clientHeight, scrollHeight, scrollTop } = container;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Handle conversation click
  const handleClick = (id: string) => {
    router.push(`/chat/${id}`);
    if (onConversationClick) {
      onConversationClick(id);
    }
  };

  // Handle rename
  const handleRename = useCallback((id: string, currentTitle: string) => {
    setRenameDialog({ id, open: true, title: currentTitle });
  }, []);

  // Handle rename submit
  const handleRenameSubmit = useCallback(() => {
    if (!renameDialog.title.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    updateConversation(
      { title: renameDialog.title.trim() },
      {
        onError: () => {
          toast.error('Failed to rename conversation');
        },
        onSuccess: () => {
          toast.success('Conversation renamed');
          setRenameDialog({ id: '', open: false, title: '' });
        },
      }
    );
  }, [renameDialog.title, updateConversation]);

  // Handle archive/unarchive - using API directly since we can't use hooks dynamically
  const handleArchive = useCallback(
    async (id: string, isCurrentlyArchived: boolean) => {
      try {
        await conversationsApi.update(id, { isArchived: !isCurrentlyArchived });
        toast.success(isCurrentlyArchived ? 'Conversation restored' : 'Conversation archived');
        refetch();
      } catch {
        toast.error('Failed to update conversation');
      }
    },
    [refetch]
  );

  // Handle delete
  const handleDelete = useCallback((id: string, title: string) => {
    setDeleteDialog({ id, open: true, title });
  }, []);

  // Handle delete confirm
  const handleDeleteConfirm = useCallback(() => {
    deleteConversation(deleteDialog.id, {
      onError: () => {
        toast.error('Failed to delete conversation');
      },
      onSuccess: () => {
        toast.success('Conversation deleted');
        setDeleteDialog({ id: '', open: false, title: '' });
      },
    });
  }, [deleteDialog.id, deleteConversation]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-japandi-stone/55" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-red-600 dark:text-red-300">Failed to load conversations</p>
      </div>
    );
  }

  return (
    <>
      {/* Archived toggle */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Checkbox
            checked={showArchived}
            className="border-japandi-sand/90 data-[state=checked]:border-japandi-sage data-[state=checked]:bg-japandi-sage data-[state=checked]:text-white"
            id="show-archived"
            onCheckedChange={(checked) => setShowArchived(checked === true)}
          />
          <Label className="cursor-pointer text-xs text-japandi-stone/60" htmlFor="show-archived">
            Show archived
          </Label>
        </div>
      )}

      {/* Empty state */}
      {conversations.length === 0 ? (
        <div className={cn('px-3 py-4 text-center', collapsed && 'hidden')}>
          <p className="text-xs text-japandi-stone/60">
            {showArchived ? 'No archived conversations' : 'No conversations yet'}
          </p>
          {!showArchived && (
            <p className="mt-1 text-xs text-japandi-stone/45">Start a new chat to begin</p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1" ref={scrollContainerRef}>
          {conversations.map((conversation) => (
            <ConversationItem
              active={conversation.id === activeId}
              collapsed={collapsed}
              conversation={conversation}
              key={conversation.id}
              onArchive={handleArchive}
              onClick={() => handleClick(conversation.id)}
              onDelete={(id) => handleDelete(id, conversation.title)}
              onRename={handleRename}
            />
          ))}

          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-japandi-stone/55" />
            </div>
          )}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setRenameDialog({ id: '', open: false, title: '' })}
        open={renameDialog.open}
      >
        <DialogContent className="sm:max-w-[425px] border-japandi-sand/75 bg-japandi-cream text-japandi-stone">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription className="text-japandi-stone/70">
              Enter a new title for this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                className="border-japandi-sand/80 bg-japandi-light-stone/45 text-japandi-stone focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30"
                id="title"
                onChange={(e) => setRenameDialog((prev) => ({ ...prev, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                placeholder="Enter conversation title"
                value={renameDialog.title}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="border-japandi-sand/80 bg-japandi-cream text-japandi-stone hover:bg-japandi-light-stone/70"
              onClick={() => setRenameDialog({ id: '', open: false, title: '' })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button className="bg-japandi-terracotta text-white hover:bg-japandi-timber" onClick={handleRenameSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setDeleteDialog({ id: '', open: false, title: '' })}
        open={deleteDialog.open}
      >
        <DialogContent className="sm:max-w-[425px] border-japandi-sand/75 bg-japandi-cream text-japandi-stone">
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription className="text-japandi-stone/70">
              Are you sure you want to delete &quot;{deleteDialog.title}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="border-japandi-sand/80 bg-japandi-cream text-japandi-stone hover:bg-japandi-light-stone/70"
              onClick={() => setDeleteDialog({ id: '', open: false, title: '' })}
              variant="outline"
            >
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

function ConversationItem({
  active,
  collapsed,
  conversation,
  onArchive,
  onClick,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const lastActivity = conversation.metadata.lastMessageAt || conversation.updatedAt;
  const relativeTime = formatRelativeTime(lastActivity);
  const [menuOpen, setMenuOpen] = useState(false);

  // Menu items for context menu
  const MenuItems = () => (
    <>
      <ContextMenuItem
        className="cursor-pointer gap-2 focus:bg-japandi-light-stone/80 focus:text-japandi-stone"
        onClick={(e) => {
          e.stopPropagation();
          onRename(conversation.id, conversation.title);
        }}
      >
        <Pencil className="w-4 h-4" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem
        className="cursor-pointer gap-2 focus:bg-japandi-light-stone/80 focus:text-japandi-stone"
        onClick={(e) => {
          e.stopPropagation();
          onArchive(conversation.id, conversation.isArchived);
        }}
      >
        {conversation.isArchived ? (
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
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="cursor-pointer gap-2 text-destructive focus:bg-red-500/10 focus:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </ContextMenuItem>
    </>
  );

  // Dropdown menu items
  const DropdownItems = () => (
    <>
      <DropdownMenuItem
        className="cursor-pointer gap-2 focus:bg-japandi-light-stone/80 focus:text-japandi-stone"
        onClick={(e) => {
          e.stopPropagation();
          onRename(conversation.id, conversation.title);
        }}
      >
        <Pencil className="w-4 h-4" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer gap-2 focus:bg-japandi-light-stone/80 focus:text-japandi-stone"
        onClick={(e) => {
          e.stopPropagation();
          onArchive(conversation.id, conversation.isArchived);
        }}
      >
        {conversation.isArchived ? (
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
        className="cursor-pointer gap-2 text-destructive focus:bg-red-500/10 focus:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
        variant="destructive"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cn(
            'group relative flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            'min-h-[40px] text-left',
            active
              ? 'bg-japandi-sage/20 text-japandi-stone font-medium'
              : 'text-japandi-stone/75 hover:bg-japandi-cream/75 hover:text-japandi-stone',
            collapsed && 'justify-center px-2',
            conversation.isArchived && 'opacity-70'
          )}
          onClick={onClick}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
          role="button"
          tabIndex={0}
          title={conversation.title}
        >
          {collapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-japandi-sage/20 text-xs font-semibold text-japandi-timber">
              {conversation.title[0]?.toUpperCase() || 'C'}
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="truncate font-medium text-sm" title={conversation.title}>
                    {conversation.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-japandi-stone/55">
                  <span>{relativeTime}</span>
                  {conversation.metadata.messageCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{conversation.metadata.messageCount} messages</span>
                    </>
                  )}
                  {conversation.isArchived && (
                    <>
                      <span>•</span>
                      <Archive className="w-3 h-3" />
                    </>
                  )}
                </div>
              </div>

              {/* Three dots menu button */}
              <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={cn(
                      'h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100',
                      'hover:bg-japandi-light-stone/70',
                      menuOpen && 'opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 border-japandi-sand/80 !bg-japandi-cream text-japandi-stone shadow-xl opacity-100"
                >
                  <DropdownItems />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 border-japandi-sand/80 !bg-japandi-cream text-japandi-stone shadow-xl opacity-100">
        <MenuItems />
      </ContextMenuContent>
    </ContextMenu>
  );
}
