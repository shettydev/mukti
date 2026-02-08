'use client';

import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { Conversation, Message, PaginatedConversations } from '@/types/conversation.types';

import { conversationKeys } from '@/lib/query-keys';

interface ListSnapshot {
  previousConversation: Conversation | null;
  queryKey: readonly unknown[];
}

/**
 * Merge fetched conversation data with the existing cached conversation without
 * dropping optimistic/newer messages that may not be reflected server-side yet.
 */
export function mergeConversationPreservingRecentMessages(
  cachedConversation: Conversation | undefined,
  incomingConversation: Conversation
): Conversation {
  if (!cachedConversation || cachedConversation.id !== incomingConversation.id) {
    return incomingConversation;
  }

  const mergedMessages = mergeMessages(
    cachedConversation.recentMessages,
    incomingConversation.recentMessages
  );
  const mergedMessageCount = Math.max(
    cachedConversation.metadata.messageCount,
    incomingConversation.metadata.messageCount,
    mergedMessages.length
  );
  const mergedLastMessageAt = getLatestTimestamp(
    cachedConversation.metadata.lastMessageAt,
    incomingConversation.metadata.lastMessageAt,
    mergedMessages[mergedMessages.length - 1]?.timestamp
  );

  return {
    ...incomingConversation,
    hasArchivedMessages:
      incomingConversation.hasArchivedMessages || cachedConversation.hasArchivedMessages,
    metadata: {
      ...incomingConversation.metadata,
      estimatedCost: Math.max(
        incomingConversation.metadata.estimatedCost,
        cachedConversation.metadata.estimatedCost
      ),
      lastMessageAt: mergedLastMessageAt,
      messageCount: mergedMessageCount,
      totalTokens: Math.max(
        incomingConversation.metadata.totalTokens,
        cachedConversation.metadata.totalTokens
      ),
    },
    recentMessages: mergedMessages,
    updatedAt:
      getLatestTimestamp(incomingConversation.updatedAt, cachedConversation.updatedAt) ||
      incomingConversation.updatedAt,
  };
}

export async function optimisticallyAppendUserMessage(
  queryClient: QueryClient,
  conversationId: string,
  content: string
): Promise<{ rollback: () => void }> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: conversationKeys.detail(conversationId) }),
    queryClient.cancelQueries({ queryKey: conversationKeys.lists() }),
  ]);

  const previousConversation = queryClient.getQueryData<Conversation>(
    conversationKeys.detail(conversationId)
  );
  const previousLists = queryClient.getQueriesData<InfiniteData<PaginatedConversations>>({
    queryKey: conversationKeys.lists(),
  });
  const listSnapshots = snapshotListConversations(previousLists, conversationId);
  const fallbackConversation =
    previousConversation ?? findConversationInLists(previousLists, conversationId);
  const rollbackConversation = fallbackConversation;

  const didSeedDetail = !previousConversation && !!fallbackConversation;

  if (didSeedDetail && fallbackConversation) {
    queryClient.setQueryData(conversationKeys.detail(conversationId), fallbackConversation);
  }

  let optimisticMessage: Message | null = null;
  let didAppend = false;
  let didUpdateLists = false;
  const timestamp = new Date().toISOString();

  queryClient.setQueryData<Conversation>(conversationKeys.detail(conversationId), (old) => {
    if (!old) {
      return old;
    }

    const nextSequence =
      Math.max(old.metadata.messageCount, ...old.recentMessages.map((m) => m.sequence)) + 1;

    const message: Message = {
      content,
      role: 'user',
      sequence: nextSequence,
      timestamp,
    };

    optimisticMessage = message;

    const messageExists = old.recentMessages.some((msg) => msg.sequence === message.sequence);
    if (messageExists) {
      return old;
    }

    didAppend = true;

    return {
      ...old,
      metadata: {
        ...old.metadata,
        lastMessageAt: timestamp,
        messageCount: old.metadata.messageCount + 1,
      },
      recentMessages: [...old.recentMessages, message],
      updatedAt: timestamp,
    };
  });

  if (optimisticMessage && didAppend) {
    queryClient.setQueriesData<InfiniteData<PaginatedConversations>>(
      { queryKey: conversationKeys.lists() },
      (old) => {
        if (!old) {
          return old;
        }

        let hasChanges = false;
        const pages = old.pages.map((page) => {
          let pageChanged = false;
          const data = page.data.map((conv) => {
            if (conv.id !== conversationId) {
              return conv;
            }

            const messageExists = conv.recentMessages.some(
              (msg) => msg.sequence === optimisticMessage!.sequence
            );
            if (messageExists) {
              return conv;
            }

            pageChanged = true;

            return {
              ...conv,
              metadata: {
                ...conv.metadata,
                lastMessageAt: timestamp,
                messageCount: conv.metadata.messageCount + 1,
              },
              recentMessages: [...conv.recentMessages, optimisticMessage!],
              updatedAt: timestamp,
            };
          });

          if (!pageChanged) {
            return page;
          }

          hasChanges = true;

          return {
            ...page,
            data,
          };
        });

        if (!hasChanges) {
          return old;
        }

        didUpdateLists = true;

        return {
          ...old,
          pages,
        };
      }
    );
  }

  const rollback = () => {
    if (didAppend || didSeedDetail) {
      if (rollbackConversation) {
        queryClient.setQueryData(conversationKeys.detail(conversationId), rollbackConversation);
      } else {
        queryClient.removeQueries({
          exact: true,
          queryKey: conversationKeys.detail(conversationId),
        });
      }
    }

    if (!didUpdateLists) {
      return;
    }

    listSnapshots.forEach(({ previousConversation: previousListConversation, queryKey }) => {
      if (!previousListConversation) {
        return;
      }

      queryClient.setQueryData<InfiniteData<PaginatedConversations>>(queryKey, (old) => {
        if (!old) {
          return old;
        }

        let hasChanges = false;
        const pages = old.pages.map((page) => {
          let pageChanged = false;
          const data = page.data.map((conv) => {
            if (conv.id !== conversationId) {
              return conv;
            }

            pageChanged = true;
            return previousListConversation;
          });

          if (!pageChanged) {
            return page;
          }

          hasChanges = true;

          return {
            ...page,
            data,
          };
        });

        return hasChanges
          ? {
              ...old,
              pages,
            }
          : old;
      });
    });
  };

  return { rollback };
}

function findConversationInLists(
  lists: [readonly unknown[], InfiniteData<PaginatedConversations> | undefined][],
  conversationId: string
): Conversation | null {
  for (const [, data] of lists) {
    if (!data) {
      continue;
    }

    for (const page of data.pages) {
      const match = page.data.find((conv) => conv.id === conversationId);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function getLatestTimestamp(...timestamps: Array<string | undefined>): string | undefined {
  const validTimestamps = timestamps.filter((timestamp): timestamp is string => !!timestamp);
  if (validTimestamps.length === 0) {
    return undefined;
  }

  return validTimestamps.reduce((latest, current) =>
    new Date(current).getTime() > new Date(latest).getTime() ? current : latest
  );
}

function mergeMessages(cachedMessages: Message[], incomingMessages: Message[]): Message[] {
  const messageBySequence = new Map<number, Message>();

  cachedMessages.forEach((message) => {
    messageBySequence.set(message.sequence, message);
  });

  // Prefer incoming messages on sequence collisions to align with server-authoritative payloads.
  incomingMessages.forEach((message) => {
    messageBySequence.set(message.sequence, message);
  });

  return Array.from(messageBySequence.values()).sort((a, b) => a.sequence - b.sequence);
}

function snapshotListConversations(
  lists: [readonly unknown[], InfiniteData<PaginatedConversations> | undefined][],
  conversationId: string
): ListSnapshot[] {
  return lists.map(([queryKey, data]) => {
    if (!data) {
      return { previousConversation: null, queryKey };
    }

    for (const page of data.pages) {
      const match = page.data.find((conv) => conv.id === conversationId);
      if (match) {
        return { previousConversation: match, queryKey };
      }
    }

    return { previousConversation: null, queryKey };
  });
}
