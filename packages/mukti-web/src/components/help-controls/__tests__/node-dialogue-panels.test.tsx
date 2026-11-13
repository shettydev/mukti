/**
 * Help controls mounted in the canvas and thought-map node dialogue panels
 * (dialogue-help-controls: "Help controls cover every Socratic dialogue
 * surface"), and the Explanation / Summary tags on replies.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CanvasNode } from '@/types/canvas-visualization.types';
import type { ThoughtMapNode } from '@/types/thought-map';

import { NodeChatPanel } from '@/components/canvas/chat/node-chat-panel';
import { ThoughtMapDialoguePanel } from '@/components/thought-map/ThoughtMapDialoguePanel';
import { isLocalMode } from '@/lib/config';
import { useDataDisclosureStore } from '@/lib/stores/data-disclosure-store';

jest.mock('@/lib/config', () => ({ isLocalMode: jest.fn(() => false) }));

const canvasSend = jest.fn();
const mapSend = jest.fn();
let mockMutationError: unknown = null;
let mockStartError: unknown = null;
let mockStreamError: unknown = null;

jest.mock('@/lib/hooks/use-dialogue', () => ({
  useDialogueStream: () => ({
    error: mockStreamError,
    isProcessing: false,
    processingStatus: null,
  }),
  useNodeMessages: () => ({ data: mockPages(), isLoading: false }),
  useSendNodeMessage: () => ({ error: mockMutationError, isPending: false, mutate: canvasSend }),
  useUpdateNodeDialogue: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/lib/hooks/use-thought-map-dialogue', () => ({
  useSendThoughtMapMessage: () => ({ error: mockMutationError, isPending: false, mutate: mapSend }),
  useStartThoughtMapDialogue: () => ({
    error: mockStartError,
    isPending: false,
    mutate: jest.fn(),
  }),
  useThoughtMapDialogueStream: () => ({
    error: mockStreamError,
    isProcessing: false,
    processingStatus: null,
  }),
  useThoughtMapNodeMessages: () => ({ data: mockPages(), isLoading: false }),
  useUpdateThoughtMapDialogue: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/lib/stores/ai-store', () => ({
  useAiStore: (select: (state: { activeModel: string }) => unknown) =>
    select({ activeModel: 'sonnet' }),
}));

let mockDialogue: Record<string, unknown> = {};
let mockMessages: Array<Record<string, unknown>> = [];

function mockPages() {
  return {
    pages: [
      {
        dialogue: mockDialogue,
        messages: mockMessages,
        pagination: {
          hasMore: false,
          limit: 20,
          page: 1,
          total: mockMessages.length,
          totalPages: 1,
        },
      },
    ],
  };
}

const message = (
  sequence: number,
  role: 'assistant' | 'user',
  content: string,
  turnKind?: string
) => ({
  content,
  dialogueId: 'dialogue-1',
  id: `m${sequence}`,
  metadata: turnKind ? { turnKind } : undefined,
  role,
  sequence,
  timestamp: '2026-01-01T00:00:00Z',
});

const canvasNode = {
  data: { label: 'Why is churn up?' },
  id: 'seed',
  position: { x: 0, y: 0 },
  type: 'seed',
} as unknown as CanvasNode;

const mapNode = {
  label: 'Retry handler',
  nodeId: 'topic-0',
  type: 'topic',
} as unknown as ThoughtMapNode;

const surfaces = [
  {
    element: <NodeChatPanel onClose={jest.fn()} selectedNode={canvasNode} sessionId="session-1" />,
    name: 'canvas node dialogue',
    renderPanel: () =>
      render(<NodeChatPanel onClose={jest.fn()} selectedNode={canvasNode} sessionId="session-1" />),
    send: canvasSend,
  },
  {
    element: <ThoughtMapDialoguePanel mapId="map-1" node={mapNode} onClose={jest.fn()} />,
    name: 'thought-map node dialogue',
    renderPanel: () =>
      render(<ThoughtMapDialoguePanel mapId="map-1" node={mapNode} onClose={jest.fn()} />),
    send: mapSend,
  },
];

describe.each(surfaces)('$name panel', ({ element, renderPanel, send }) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutationError = null;
    mockStartError = null;
    mockStreamError = null;
    localStorage.clear();
    useDataDisclosureStore.getState().close();
    (isLocalMode as jest.Mock).mockReturnValue(false);
    mockDialogue = {
      currentScaffoldLevel: 2,
      id: 'dialogue-1',
      messageCount: 1,
      nodeId: 'seed',
      turnBudget: null,
    };
    mockMessages = [message(0, 'assistant', 'What makes you say that?')];
  });

  it('shows the help level, More help, Explain and Wrap up once there is a reply', () => {
    renderPanel();

    expect(screen.getByTestId('help-level')).toHaveTextContent('Hints');
    expect(screen.getByRole('button', { name: /more help/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /explain/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /wrap up/i })).toBeEnabled();
  });

  it.each(['RATE_LIMIT_EXCEEDED', 'AI_USAGE_LIMIT'])(
    'shows %s and resends the failed message without retyping',
    async (code) => {
      const view = renderPanel();
      await userEvent.type(screen.getByRole('textbox'), 'Keep my thought{Enter}');
      await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
      mockStreamError = Object.assign(new Error('Limit reached'), {
        code,
        details: {
          dailyLimit: 10,
          limit: code === 'AI_USAGE_LIMIT' ? 'cli_plan' : 'free_daily',
          provider: 'codex',
        },
      });
      mockMessages = [...mockMessages, message(1, 'user', 'Keep my thought')];
      view.rerender(element);
      expect(screen.getByRole('alert')).toHaveTextContent('Your message was kept');
      expect(screen.getByText('Keep my thought')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Resend' }));
      expect(send).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: 'Keep my thought' }),
        expect.any(Object)
      );
    }
  );

  it('holds the first local message, sends it once on continue and lets later sends through', async () => {
    (isLocalMode as jest.Mock).mockReturnValue(true);
    renderPanel();
    await userEvent.type(screen.getByRole('textbox'), 'My first thought{Enter}');
    expect(send).not.toHaveBeenCalled();
    expect(useDataDisclosureStore.getState().isOpen).toBe(true);
    act(() => useDataDisclosureStore.getState().continue());
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'My first thought' }),
      expect.any(Object)
    );
    await userEvent.type(screen.getByRole('textbox'), 'Another thought{Enter}');
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(useDataDisclosureStore.getState().isOpen).toBe(false);
  });

  it("sends Wrap up straight away for this node's dialogue", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /wrap up/i }));

    expect(send).toHaveBeenCalledWith({
      content: "Let's wrap up this dialogue.",
      helpControl: 'wrap_up',
      model: 'sonnet',
    });
  });

  it('attaches More help to the next message', async () => {
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /more help/i }));
    await userEvent.type(screen.getByRole('textbox'), 'I am stuck{Enter}');

    expect(send).toHaveBeenCalledWith(
      { content: 'I am stuck', helpControl: 'more_help', model: 'sonnet' },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it('shows the turn budget left', () => {
    // An opening question and 2 exchanges, against a budget of 3
    mockDialogue = { ...mockDialogue, messageCount: 5, turnBudget: 3 };
    renderPanel();

    expect(screen.getByTestId('turn-budget')).toHaveTextContent('2/3 turns · next wraps up');
  });

  it('tags explanations and summaries in the message list', () => {
    mockMessages = [
      message(0, 'assistant', 'What makes you say that?'),
      message(1, 'user', 'Explain it'),
      message(2, 'assistant', 'Idempotency means…', 'explain'),
      message(3, 'user', 'Wrap up'),
      message(4, 'assistant', '## Established', 'wrap_up'),
    ];
    renderPanel();

    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });
});

describe('thought-map node dialogue opening question', () => {
  beforeEach(() => {
    mockMutationError = null;
    mockStreamError = null;
    mockStartError = null;
    mockDialogue = {};
    mockMessages = [];
  });

  it('shows the usage-limit banner when the opening question is refused by the free limit', () => {
    mockStartError = {
      code: 'RATE_LIMIT_EXCEEDED',
      details: { dailyLimit: 10, resetsAt: '2026-11-14T00:00:00.000Z' },
      message: 'Daily limit reached',
      status: 429,
    };
    render(<ThoughtMapDialoguePanel mapId="map-1" node={mapNode} onClose={jest.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Daily message limit reached');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Your message was kept');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
