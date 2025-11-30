'use client';

import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import type { Conversation } from '@/types/conversation.types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { conversationsApi } from '@/lib/api/conversations';
import { config } from '@/lib/config';
import { conversationKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

interface ConversationCardProps {
  className?: string;
  conversation: Conversation;
}

/**
 * Displays a conversation summary card with metadata
 *
 * Features:
 * - Shows title, technique, last message preview, and timestamp
 * - Displays favorite status
 * - Prefetches conversation data on hover
 * - Responsive design with mobile-optimized layout
 * - Touch-friendly targets (44x44px minimum)
 * - Accessible with proper ARIA labels
 *
 *
 * @param conversation - The conversation to display
 * @param className - Optional additional CSS classes
 */
export function ConversationCard({ className, conversation }: ConversationCardProps) {
  const queryClient = useQueryClient();

  // Prefetch conversation details on hover for better UX
  // Uses centralized config for stale time
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryFn: () => conversationsApi.getById(conversation.id),
      queryKey: conversationKeys.detail(conversation.id),
      // Use centralized stale time for prefetch
      staleTime: config.cache.defaultStaleTime / 2, // 30 seconds
    });
  };

  // Get last message preview
  const lastMessage = conversation.recentMessages[conversation.recentMessages.length - 1];
  const lastMessagePreview = lastMessage
    ? lastMessage.content.slice(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
    : 'No messages yet';

  // Format timestamp
  const timestamp = conversation.metadata.lastMessageAt || conversation.updatedAt;
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  // Technique display names
  const techniqueNames: Record<string, string> = {
    analogical: 'Analogical',
    counterfactual: 'Counterfactual',
    definitional: 'Definitional',
    dialectic: 'Dialectic',
    elenchus: 'Elenchus',
    maieutics: 'Maieutics',
  };

  return (
    <Link
      aria-label={`${conversation.title} - ${techniqueNames[conversation.technique]} - ${conversation.metadata.messageCount} messages - ${timeAgo}`}
      className={cn(
        'block transition-transform hover:scale-[1.02] focus:scale-[1.02]',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg',
        'min-h-[44px]', // Touch target
        className
      )}
      href={`/dashboard/conversations/${conversation.id}`}
      onMouseEnter={handleMouseEnter}
    >
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardHeader className="p-3 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate text-base md:text-lg">{conversation.title}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1 md:gap-2 flex-wrap">
                <Badge className="text-xs" variant="outline">
                  {techniqueNames[conversation.technique]}
                </Badge>
                {/* Show only first 2 tags on mobile */}
                {conversation.tags.slice(0, 2).map((tag) => (
                  <Badge className="text-xs" key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {conversation.tags.length > 2 && (
                  <Badge className="text-xs hidden sm:inline-flex" variant="secondary">
                    +{conversation.tags.length - 2}
                  </Badge>
                )}
              </CardDescription>
            </div>
            {conversation.isFavorite && (
              <Heart
                aria-label="Favorited"
                className="h-4 w-4 fill-red-500 text-red-500 shrink-0"
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2 md:mb-3">
            {lastMessagePreview}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MessageSquare aria-hidden="true" className="h-3 w-3" />
              <span>{conversation.metadata.messageCount} messages</span>
            </div>
            <time dateTime={timestamp}>{timeAgo}</time>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
