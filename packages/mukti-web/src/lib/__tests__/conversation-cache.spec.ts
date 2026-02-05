import type { InfiniteData } from '@tanstack/react-query';

import { describe, expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import type { Conversation, PaginatedConversations } from '@/types/conversation.types';

import { optimisticallyAppendUserMessage } from '@/lib/conversation-cache';
import { conversationKeys } from '@/lib/query-keys';

const baseConversation: Conversation = {
  createdAt: '2025-01-01T00:00:00.000Z',
  hasArchivedMessages: false,
  id: 'conv-123',
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0,
    messageCount: 0,
    totalTokens: 0,
  },
  recentMessages: [],
  tags: [],
  technique: 'elenchus',
  title: 'Test conversation',
  updatedAt: '2025-01-01T00:00:00.000Z',
  userId: 'user-1',
};

function buildListData(conversation: Conversation): InfiniteData<PaginatedConversations> {
  return {
    pageParams: [1],
    pages: [
      {
        data: [conversation],
        meta: {
          limit: 20,
          page: 1,
          total: 1,
          totalPages: 1,
        },
      },
    ],
  };
}

describe('optimisticallyAppendUserMessage', () => {
  it('appends a user message and rolls back detail and list caches', async () => {
    const queryClient = new QueryClient();
    const listData = buildListData(baseConversation);

    queryClient.setQueryData(conversationKeys.detail(baseConversation.id), baseConversation);
    queryClient.setQueryData(conversationKeys.list({}), listData);

    const { rollback } = await optimisticallyAppendUserMessage(
      queryClient,
      baseConversation.id,
      'Hello there'
    );

    const updatedDetail = queryClient.getQueryData<Conversation>(
      conversationKeys.detail(baseConversation.id)
    );
    const updatedList = queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
      conversationKeys.list({})
    );

    expect(updatedDetail).toBeDefined();
    expect(updatedDetail!.recentMessages).toHaveLength(1);
    expect(updatedDetail!.recentMessages[0].content).toBe('Hello there');
    expect(updatedDetail!.recentMessages[0].role).toBe('user');
    expect(updatedDetail!.recentMessages[0].sequence).toBe(1);
    expect(updatedDetail!.metadata.messageCount).toBe(1);
    expect(updatedDetail!.metadata.lastMessageAt).toBe(updatedDetail!.recentMessages[0].timestamp);

    const listConversation = updatedList?.pages[0].data[0];
    expect(listConversation?.metadata.messageCount).toBe(1);
    expect(listConversation?.recentMessages).toHaveLength(1);
    expect(listConversation?.recentMessages[0].content).toBe('Hello there');

    rollback();

    const rolledBackDetail = queryClient.getQueryData<Conversation>(
      conversationKeys.detail(baseConversation.id)
    );
    const rolledBackList = queryClient.getQueryData<InfiniteData<PaginatedConversations>>(
      conversationKeys.list({})
    );

    expect(rolledBackDetail).toEqual(baseConversation);
    expect(rolledBackList).toEqual(listData);
  });

  it('seeds detail from list cache when missing and keeps conversation on rollback', async () => {
    const queryClient = new QueryClient();
    const listData = buildListData(baseConversation);

    queryClient.setQueryData(conversationKeys.list({}), listData);

    const { rollback } = await optimisticallyAppendUserMessage(
      queryClient,
      baseConversation.id,
      'First message'
    );

    const seededDetail = queryClient.getQueryData<Conversation>(
      conversationKeys.detail(baseConversation.id)
    );

    expect(seededDetail).toBeDefined();
    expect(seededDetail!.recentMessages).toHaveLength(1);

    rollback();

    const rolledBackDetail = queryClient.getQueryData<Conversation>(
      conversationKeys.detail(baseConversation.id)
    );

    expect(rolledBackDetail).toEqual(baseConversation);
  });
});
