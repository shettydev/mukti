/**
 * The chat stream and help controls (dialogue-help-controls): a streamed reply
 * keeps its kind, and `complete` applies the settled help level, records a
 * wrap-up and fills the budget only when the cache does not know it.
 */
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { Conversation } from '@/types/conversation.types';

import { conversationKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

import { useConversationStream } from '../use-conversation-stream';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  close() {}

  emit(event: Record<string, unknown>) {
    this.onmessage?.(
      new MessageEvent('message', {
        data: JSON.stringify({ conversationId: 'conv-1', timestamp: 't', ...event }),
      })
    );
  }
}

const conversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  createdAt: '2026-01-01T00:00:00Z',
  currentScaffoldLevel: 1,
  hasArchivedMessages: false,
  id: 'conv-1',
  isArchived: false,
  isFavorite: false,
  metadata: { estimatedCost: 0, messageCount: 2, totalTokens: 0 },
  recentMessages: [
    { content: 'Help', role: 'user', sequence: 1, timestamp: 't1' },
    { content: 'What do you see?', role: 'assistant', sequence: 2, timestamp: 't2' },
  ],
  tags: [],
  technique: 'elenchus',
  title: 'Retry handler',
  turnBudget: 5,
  updatedAt: '2026-01-01T00:00:00Z',
  userId: 'user-1',
  ...overrides,
});

describe('useConversationStream with help controls', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const cached = () => queryClient.getQueryData<Conversation>(conversationKeys.detail('conv-1'))!;

  const connect = async () => {
    renderHook(() => useConversationStream({ conversationId: 'conv-1' }), { wrapper });
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    return MockEventSource.instances[0];
  };

  beforeAll(() => {
    global.EventSource = MockEventSource as unknown as typeof EventSource;
  });

  beforeEach(() => {
    MockEventSource.instances = [];
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.setState({ accessToken: 'token' });
  });

  it('keeps the kind of a streamed reply', async () => {
    queryClient.setQueryData(conversationKeys.detail('conv-1'), conversation());
    const source = await connect();

    act(() =>
      source.emit({
        data: {
          content: '## Established\n- ...',
          role: 'assistant',
          sequence: 4,
          timestamp: 't4',
          turnKind: 'wrap_up',
        },
        type: 'message',
      })
    );

    expect(cached().recentMessages.at(-1)).toMatchObject({ sequence: 4, turnKind: 'wrap_up' });
  });

  it('applies the help level, records the wrap-up and tags the reply on complete', async () => {
    queryClient.setQueryData(conversationKeys.detail('conv-1'), conversation());
    const source = await connect();

    act(() =>
      source.emit({
        data: {
          budget: { limit: 5, used: 2 },
          conclusionReady: true,
          cost: 0,
          jobId: 'job-1',
          latency: 3,
          scaffoldLevel: 3,
          tokens: 10,
          turnKind: 'wrap_up',
        },
        type: 'complete',
      })
    );

    const after = cached();
    expect(after.currentScaffoldLevel).toBe(3);
    expect(after.conclusionOffered).toBe(true);
    expect(after.conclusionReady).toBe(true);
    expect(after.turnBudget).toBe(5);
    expect(after.recentMessages[1]).toMatchObject({ turnKind: 'wrap_up' });
  });

  it('keeps a budget the learner changed while the reply was written', async () => {
    queryClient.setQueryData(conversationKeys.detail('conv-1'), conversation({ turnBudget: null }));
    const source = await connect();

    act(() =>
      source.emit({
        data: {
          budget: { limit: 5, used: 2 },
          cost: 0,
          jobId: 'job-1',
          latency: 3,
          scaffoldLevel: 1,
          tokens: 10,
          turnKind: 'ordinary',
        },
        type: 'complete',
      })
    );

    expect(cached().turnBudget).toBeNull();
    expect(cached().conclusionOffered).toBeFalsy();
  });
});
