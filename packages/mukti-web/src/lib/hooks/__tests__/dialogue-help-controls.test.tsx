/**
 * Node-dialogue hooks and help controls (dialogue-help-controls), for both
 * the canvas (`use-dialogue`) and thought-map (`use-thought-map-dialogue`)
 * dialogues: the control goes out with the message, the stream applies the
 * settled help level and tags replies, and the budget can be set and cleared.
 */
import type { HelpControl } from '@muktiai/contracts';
import type { InfiniteData } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { dialogueApi } from '@/lib/api/dialogue';
import { thoughtMapDialogueApi } from '@/lib/api/thought-map-dialogue';
import { dialogueKeys, thoughtMapDialogueKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/lib/stores/auth-store';

import { useDialogueStream, useSendNodeMessage, useUpdateNodeDialogue } from '../use-dialogue';
import {
  useSendThoughtMapMessage,
  useThoughtMapDialogueStream,
  useUpdateThoughtMapDialogue,
} from '../use-thought-map-dialogue';

jest.mock('@/lib/api/dialogue', () => ({
  dialogueApi: {
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    subscribeToStream: jest.fn(),
    updateDialogue: jest.fn(),
  },
}));

jest.mock('@/lib/api/thought-map-dialogue', () => ({
  thoughtMapDialogueApi: {
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    startDialogue: jest.fn(),
    subscribeToStream: jest.fn(),
    updateDialogue: jest.fn(),
  },
}));

type Page = {
  dialogue: null | Record<string, unknown>;
  messages: Array<Record<string, unknown>>;
  pagination: Record<string, unknown>;
};

const dialogue = {
  createdAt: '2026-01-01T00:00:00Z',
  currentScaffoldLevel: 1,
  id: 'dialogue-1',
  mapId: 'map-1',
  messageCount: 3,
  nodeId: 'seed',
  nodeLabel: 'Why is churn up?',
  nodeType: 'seed',
  sessionId: 'session-1',
  turnBudget: null,
};

const seedPage = (overrides: Partial<Page> = {}): InfiniteData<Page> => ({
  pageParams: [1],
  pages: [
    {
      dialogue,
      messages: [
        { content: 'Opening?', id: 'm0', role: 'assistant', sequence: 0, timestamp: 't0' },
        { content: 'My idea', id: 'm1', role: 'user', sequence: 1, timestamp: 't1' },
        { content: 'Why so?', id: 'm2', role: 'assistant', sequence: 2, timestamp: 't2' },
      ],
      pagination: { hasMore: false, limit: 20, page: 1, total: 3, totalPages: 1 },
      ...overrides,
    },
  ],
});

/** What the tests need from each surface's hooks, whatever their own types. */
interface Surface {
  api: Record<string, jest.Mock>;
  key: readonly unknown[];
  name: string;
  owner: string;
  useSend: () => { mutate: (dto: { content: string; helpControl?: HelpControl }) => void };
  useStream: () => unknown;
  useUpdate: () => {
    mutateAsync: (dto: { turnBudget?: null | number }) => Promise<unknown>;
  };
}

const surfaces: Surface[] = [
  {
    api: dialogueApi as unknown as Record<string, jest.Mock>,
    key: dialogueKeys.messages('session-1', 'seed'),
    name: 'canvas node dialogue',
    owner: 'session-1',
    useSend: () => useSendNodeMessage('session-1', 'seed'),
    useStream: () => useDialogueStream('session-1', 'seed', true),
    useUpdate: () => useUpdateNodeDialogue('session-1', 'seed'),
  },
  {
    api: thoughtMapDialogueApi as unknown as Record<string, jest.Mock>,
    key: thoughtMapDialogueKeys.messages('map-1', 'seed'),
    name: 'thought-map node dialogue',
    owner: 'map-1',
    useSend: () => useSendThoughtMapMessage('map-1', 'seed'),
    useStream: () => useThoughtMapDialogueStream('map-1', 'seed', true),
    useUpdate: () => useUpdateThoughtMapDialogue('map-1', 'seed'),
  },
];

describe.each(surfaces)('$name hooks', ({ api, key, owner, useSend, useStream, useUpdate }) => {
  let queryClient: QueryClient;
  let emit: (event: Record<string, unknown>) => void;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const cached = () => queryClient.getQueryData<InfiniteData<Page>>(key)!;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(key, seedPage());
    useAuthStore.setState({ accessToken: 'token' });
    api.subscribeToStream.mockImplementation(
      (_owner: string, _node: string, _token: string, onEvent: (e: unknown) => void) => {
        emit = (event) => act(() => onEvent(event));
        return jest.fn();
      }
    );
  });

  it('sends the help control with the message', async () => {
    api.sendMessage.mockResolvedValue({ jobId: 'job-1', position: 1 });
    const { result } = renderHook(useSend, { wrapper });

    act(() => {
      result.current.mutate({ content: 'Explain please', helpControl: 'explain' });
    });

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith(owner, 'seed', {
        content: 'Explain please',
        helpControl: 'explain',
      })
    );
  });

  it("tags a streamed reply with its kind, and applies the turn's help level on complete", async () => {
    renderHook(useStream, { wrapper });
    await waitFor(() => expect(api.subscribeToStream).toHaveBeenCalled());

    emit({
      data: {
        content: 'Idempotency means…',
        role: 'assistant',
        sequence: 4,
        timestamp: 't4',
        tokens: 9,
        turnKind: 'explain',
      },
      dialogueId: 'dialogue-1',
      type: 'message',
    });
    expect(cached().pages[0].messages.at(-1)).toMatchObject({
      metadata: { tokens: 9, turnKind: 'explain' },
      role: 'assistant',
    });

    emit({
      data: {
        budget: null,
        cost: 0,
        jobId: 'job-1',
        latency: 5,
        scaffoldLevel: 3,
        tokens: 9,
        turnKind: 'explain',
      },
      dialogueId: 'dialogue-1',
      type: 'complete',
    });
    expect(cached().pages[0].dialogue).toMatchObject({ currentScaffoldLevel: 3 });
  });

  it('tags the newest reply on complete when its message event carried no kind', async () => {
    renderHook(useStream, { wrapper });
    await waitFor(() => expect(api.subscribeToStream).toHaveBeenCalled());

    emit({
      data: {
        cost: 0,
        jobId: 'job-1',
        latency: 5,
        scaffoldLevel: 1,
        tokens: 9,
        turnKind: 'wrap_up',
      },
      dialogueId: 'dialogue-1',
      type: 'complete',
    });

    expect(cached().pages[0].messages[2]).toMatchObject({ metadata: { turnKind: 'wrap_up' } });
    expect(cached().pages[0].messages[0].metadata).toBeUndefined();
  });

  it('sets the budget optimistically and keeps the saved value', async () => {
    api.updateDialogue.mockResolvedValue({ ...dialogue, turnBudget: 5 });
    const { result } = renderHook(useUpdate, { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ turnBudget: 5 });
    });

    expect(api.updateDialogue).toHaveBeenCalledWith(owner, 'seed', { turnBudget: 5 });
    expect(cached().pages[0].dialogue).toMatchObject({ turnBudget: 5 });
  });

  it('rolls the budget back when saving fails', async () => {
    queryClient.setQueryData(key, seedPage({ dialogue: { ...dialogue, turnBudget: 4 } }));
    api.updateDialogue.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(useUpdate, { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ turnBudget: null }).catch(() => undefined);
    });

    expect(cached().pages[0].dialogue).toMatchObject({ turnBudget: 4 });
  });

  it('adopts the dialogue the request created for a node that had none', async () => {
    queryClient.setQueryData(key, seedPage({ dialogue: null, messages: [] }));
    api.updateDialogue.mockResolvedValue({ ...dialogue, messageCount: 0, turnBudget: 3 });
    const { result } = renderHook(useUpdate, { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ turnBudget: 3 });
    });

    expect(cached().pages[0].dialogue).toMatchObject({ id: 'dialogue-1', turnBudget: 3 });
  });
});
