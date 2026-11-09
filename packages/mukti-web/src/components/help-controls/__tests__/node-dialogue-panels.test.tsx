/**
 * Help controls mounted in the canvas and thought-map node dialogue panels
 * (dialogue-help-controls: "Help controls cover every Socratic dialogue
 * surface"), and the Explanation / Summary tags on replies.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CanvasNode } from '@/types/canvas-visualization.types';
import type { ThoughtMapNode } from '@/types/thought-map';

import { NodeChatPanel } from '@/components/canvas/chat/node-chat-panel';
import { ThoughtMapDialoguePanel } from '@/components/thought-map/ThoughtMapDialoguePanel';

const canvasSend = jest.fn();
const mapSend = jest.fn();

jest.mock('@/lib/hooks/use-dialogue', () => ({
  useDialogueStream: () => ({ error: null, isProcessing: false, processingStatus: null }),
  useNodeMessages: () => ({ data: mockPages(), isLoading: false }),
  useSendNodeMessage: () => ({ isPending: false, mutate: canvasSend }),
  useUpdateNodeDialogue: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/lib/hooks/use-thought-map-dialogue', () => ({
  useSendThoughtMapMessage: () => ({ isPending: false, mutate: mapSend }),
  useStartThoughtMapDialogue: () => ({ isPending: false, mutate: jest.fn() }),
  useThoughtMapDialogueStream: () => ({ error: null, isProcessing: false, processingStatus: null }),
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
    name: 'canvas node dialogue',
    renderPanel: () =>
      render(<NodeChatPanel onClose={jest.fn()} selectedNode={canvasNode} sessionId="session-1" />),
    send: canvasSend,
  },
  {
    name: 'thought-map node dialogue',
    renderPanel: () =>
      render(<ThoughtMapDialoguePanel mapId="map-1" node={mapNode} onClose={jest.fn()} />),
    send: mapSend,
  },
];

describe.each(surfaces)('$name panel', ({ renderPanel, send }) => {
  beforeEach(() => {
    jest.clearAllMocks();
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
