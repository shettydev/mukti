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
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="space-y-1 px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <ConversationSkeleton collapsed={collapsed} key={i} />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-xs text-red-400">Failed to load conversations</p>
      </div>
    );
  }

  return (
    <>
      {/* Archived toggle */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Checkbox
            aria-describedby="show-archived-description"
            checked={showArchived}
            id="show-archived"
            onCheckedChange={(checked) => setShowArchived(checked === true)}
          />
          <Label className="text-xs text-white/50 cursor-pointer" htmlFor="show-archived">
            Show archived
          </Label>
          <span className="sr-only" id="show-archived-description">
            Toggle to show or hide archived conversations
          </span>
        </div>
      )}

      {/* Empty state */}
      {conversations.length === 0 ? (
        <div className={cn('px-3 py-4 text-center', collapsed && 'hidden')} role="status">
          <p className="text-xs text-white/50">
            {showArchived ? 'No archived conversations' : 'No conversations yet'}
          </p>
          {!showArchived && <p className="text-xs text-white/30 mt-1">Start a new chat to begin</p>}
        </div>
      ) : (
        <nav
          aria-label="Conversation list"
          className="flex-1 overflow-y-auto space-y-1"
          ref={scrollContainerRef}
        >
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
            <div aria-live="polite" className="flex items-center justify-center py-4" role="status">
              <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-white/50" />
              <span className="sr-only">Loading more conversations</span>
            </div>
          )}
        </nav>
      )}

      {/* Rename Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setRenameDialog({ id: '', open: false, title: '' })}
        open={renameDialog.open}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Enter a new title for this conversation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
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
              onClick={() => setRenameDialog({ id: '', open: false, title: '' })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setDeleteDialog({ id: '', open: false, title: '' })}
        open={deleteDialog.open}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.title}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
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
        className="gap-2 cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-purple-500/30 focus:ring-inset active:scale-[0.98]"
        onClick={(e) => {
          e.stopPropagation();
          onRename(conversation.id, conversation.title);
        }}
      >
        <Pencil className="w-4 h-4" />
        Rename
      </ContextMenuItem>
      <ContextMenuItem
        className="gap-2 cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-purple-500/30 focus:ring-inset active:scale-[0.98]"
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
        className="gap-2 cursor-pointer text-destructive focus:text-destructive transition-all duration-150 focus:ring-2 focus:ring-red-400/30 focus:ring-inset active:scale-[0.98]"
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
        className="gap-2 cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-purple-500/30 focus:ring-inset active:scale-[0.98]"
        onClick={(e) => {
          e.stopPropagation();
          onRename(conversation.id, conversation.title);
        }}
      >
        <Pencil className="w-4 h-4" />
        Rename
      </DropdownMenuItem>
      <DropdownMenuItem
        className="gap-2 cursor-pointer transition-all duration-150 focus:ring-2 focus:ring-purple-500/30 focus:ring-inset active:scale-[0.98]"
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
        className="gap-2 cursor-pointer text-destructive focus:text-destructive transition-all duration-150 focus:ring-2 focus:ring-red-400/30 focus:ring-inset active:scale-[0.98]"
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
        <article
          aria-current={active ? 'page' : undefined}
          aria-label={`Conversation: ${conversation.title}`}
          className={cn(
            'group relative w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer',
            'min-h-[48px] sm:min-h-[40px] text-left',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#111111]',
            'animate-fade-in',
            active
              ? 'bg-white/10 text-white font-medium'
              : 'text-white/80 hover:text-white hover:bg-white/5 active:bg-white/10',
            collapsed && 'justify-center px-2',
            conversation.isArchived && 'opacity-60'
          )}
          onClick={onClick}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
          role="button"
          tabIndex={0}
          title={conversation.title}
        >
          {collapsed ? (
            <div
              aria-label={conversation.title}
              className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300"
            >
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
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <time dateTime={lastActivity}>{relativeTime}</time>
                  {conversation.metadata.messageCount > 0 && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span>{conversation.metadata.messageCount} messages</span>
                    </>
                  )}
                  {conversation.isArchived && (
                    <>
                      <span aria-hidden="true">•</span>
                      <Archive aria-label="Archived" className="w-3 h-3" />
                    </>
                  )}
                </div>
              </div>

              {/* Three dots menu button */}
              <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={`More actions for ${conversation.title}`}
                    className={cn(
                      'h-8 w-8 sm:h-7 sm:w-7 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200',
                      'hover:bg-white/10 active:scale-95',
                      'focus:ring-2 focus:ring-purple-500/30 focus:ring-offset-2 focus:ring-offset-[#111111]',
                      menuOpen && 'opacity-100'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <MoreHorizontal aria-hidden="true" className="w-4 h-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownItems />
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <MenuItems />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Skeleton loader for conversation items
 * Displays animated placeholder while conversations are loading
 */
function ConversationSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 sm:py-2 rounded-lg',
        'min-h-[48px] sm:min-h-[40px]',
        collapsed && 'justify-center px-2'
      )}
    >
      {collapsed ? (
        <Skeleton className="w-8 h-8 rounded-full" />
      ) : (
        <>
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-7 rounded-md" />
        </>
      )}
    </div>
  );
}
