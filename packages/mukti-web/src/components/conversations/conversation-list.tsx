'use client';

import { AlertCircle, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { ConversationFilters } from '@/types/conversation.types';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { config } from '@/lib/config';
import { useInfiniteConversations } from '@/lib/hooks/use-conversations';

import { ConversationCard } from './conversation-card';
import { ConversationFilters as Filters } from './conversation-filters';

interface ConversationListProps {
  className?: string;
  initialFilters?: ConversationFilters;
}

/**
 * Conversation list with infinite scroll
 *
 * Features:
 * - Infinite scroll with automatic page loading
 * - Filtering by technique, tags, archived, favorite
 * - Sorting options
 * - Skeleton loading states
 * - Empty state with create CTA
 * - Error state with retry
 * - Prefetching on card hover
 * - Responsive grid (1 column mobile, 2 tablet, 3 desktop)
 * - Touch-friendly targets
 *
 */
export function ConversationList({ className, initialFilters }: ConversationListProps) {
  const [filters, setFilters] = useState<ConversationFilters>(
    initialFilters || {
      // Use centralized pagination config (20 items per page)
      limit: config.pagination.defaultPageSize,
      sort: 'updatedAt',
    }
  );

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteConversations(filters);

  // Intersection Observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Handle filter changes - reset to page 1
  const handleFiltersChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
  };

  // Get all conversations from pages
  const conversations = data?.pages.flatMap((page) => page.data) || [];
  const totalCount = data?.pages[0]?.meta.total || 0;

  // Loading state - responsive skeleton grid
  if (isLoading) {
    return (
      <div aria-label="Loading conversations" className={className} role="status">
        <div className="mb-4 md:mb-6">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        {/* Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton className="h-40 md:h-48" key={i} />
          ))}
        </div>
        <span className="sr-only">Loading conversations...</span>
      </div>
    );
  }

  // Error state with accessible alert
  if (error) {
    return (
      <div aria-live="polite" className={className} role="alert">
        <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center px-4">
          <AlertCircle
            aria-hidden="true"
            className="h-10 w-10 md:h-12 md:w-12 text-destructive mb-4"
          />
          <h3 className="text-base md:text-lg font-semibold mb-2">Failed to load conversations</h3>
          <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md">
            {error.message || 'An error occurred while loading your conversations.'}
          </p>
          <Button
            aria-label="Retry loading conversations"
            className="min-h-[44px]"
            onClick={() => refetch()}
          >
            <Loader2 aria-hidden="true" className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state with accessible content
  if (conversations.length === 0) {
    return (
      <div className={className}>
        <Filters className="mb-4 md:mb-6" filters={filters} onFiltersChange={handleFiltersChange} />
        <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center px-4">
          <div className="rounded-full bg-muted p-4 md:p-6 mb-4">
            <Plus aria-hidden="true" className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
          </div>
          <h3 className="text-base md:text-lg font-semibold mb-2">No conversations yet</h3>
          <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md">
            Start your first Socratic dialogue to explore ideas through structured inquiry.
          </p>
          <Button asChild className="min-h-[44px]">
            <Link href="/dashboard/conversations/new">
              <Plus aria-hidden="true" className="h-4 w-4 mr-2" />
              Create Conversation
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters - responsive layout */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Conversations</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>
          <Button asChild className="min-h-[44px] w-full sm:w-auto">
            <Link href="/dashboard/conversations/new">
              <Plus aria-hidden="true" className="h-4 w-4 mr-2" />
              New Conversation
            </Link>
          </Button>
        </div>
        <Filters filters={filters} onFiltersChange={handleFiltersChange} />
      </div>

      {/* Conversation Grid - responsive columns */}
      <div
        aria-label="Conversations"
        className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        {conversations.map((conversation) => (
          <div key={conversation.id} role="listitem">
            <ConversationCard conversation={conversation} />
          </div>
        ))}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasNextPage && (
        <div
          aria-label="Loading more conversations"
          className="flex justify-center py-6 md:py-8"
          ref={loadMoreRef}
        >
          {isFetchingNextPage && (
            <>
              <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="sr-only">Loading more conversations...</span>
            </>
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasNextPage && conversations.length > 0 && (
        <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">
          You&apos;ve reached the end of your conversations
        </div>
      )}
    </div>
  );
}
