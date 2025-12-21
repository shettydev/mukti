'use client';

import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import type { Conversation } from '@/types/conversation.types';

import { useInfiniteConversations } from '@/lib/hooks/use-conversations';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time-formatting';

/**
 * Individual conversation item in the list
 */
interface ConversationItemProps {
  active: boolean;
  collapsed: boolean;
  conversation: Conversation;
  onClick: () => void;
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
 *
 * @example
 * ```tsx
 * <ConversationList
 *   activeConversationId="507f1f77bcf86cd799439011"
 *   collapsed={false}
 *   onConversationClick={(id) => router.push(`/chat/${id}`)}
 * />
 * ```
 */
export function ConversationList({
  activeConversationId,
  collapsed,
  onConversationClick,
}: ConversationListProps) {
  const router = useRouter();
  const params = useParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get active conversation ID from URL if not provided
  const activeId = activeConversationId || (params?.id as string);

  // Fetch conversations with infinite scroll, sorted by last activity
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteConversations({
      sort: 'updatedAt', // Sort by last activity
    });

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

      // Load more when scrolled 80% down
      if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Handle conversation click
  const handleClick = (id: string) => {
    // Always navigate to the conversation
    router.push(`/chat/${id}`);

    // Call the callback if provided (e.g., to close mobile sidebar)
    if (onConversationClick) {
      onConversationClick(id);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
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

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className={cn('px-3 py-4 text-center', collapsed && 'hidden')}>
        <p className="text-xs text-white/50">No conversations yet</p>
        <p className="text-xs text-white/30 mt-1">Start a new chat to begin</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-1" ref={scrollContainerRef}>
      {conversations.map((conversation) => (
        <ConversationItem
          active={conversation.id === activeId}
          collapsed={collapsed}
          conversation={conversation}
          key={conversation.id}
          onClick={() => handleClick(conversation.id)}
        />
      ))}

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-white/50" />
        </div>
      )}
    </div>
  );
}

function ConversationItem({ active, collapsed, conversation, onClick }: ConversationItemProps) {
  const lastActivity = conversation.metadata.lastMessageAt || conversation.updatedAt;
  const relativeTime = formatRelativeTime(lastActivity);

  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
        'min-h-[40px] text-left',
        'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#111111]',
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/80 hover:text-white hover:bg-white/5',
        collapsed && 'justify-center px-2'
      )}
      onClick={onClick}
      title={conversation.title}
      type="button"
    >
      {collapsed ? (
        // Collapsed view: Show first letter
        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-semibold text-purple-300">
          {conversation.title[0]?.toUpperCase() || 'C'}
        </div>
      ) : (
        // Expanded view: Show title and timestamp
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="truncate font-medium text-sm" title={conversation.title}>
              {conversation.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>{relativeTime}</span>
            {conversation.metadata.messageCount > 0 && (
              <>
                <span>•</span>
                <span>{conversation.metadata.messageCount} messages</span>
              </>
            )}
          </div>
        </div>
      )}
    </button>
  );
}
