import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThoughtMapCanvas } from '../ThoughtMapCanvas';

const mockAcceptGhostNode = jest.fn();
const mockDeleteNode = jest.fn();
const mockRemoveGhostNode = jest.fn();
const mockRequestSuggestions = jest.fn();
const mockSetMap = jest.fn();
const mockSetSelectedNodeId = jest.fn();
const mockUpdateNode = jest.fn();
const mockOnNodesChange = jest.fn();
const mockSetNodes = jest.fn();

const topicNode = {
  createdAt: '2026-01-01T00:00:00.000Z',
  depth: 0,
  fromSuggestion: false,
  id: 'topic-id',
  isCollapsed: false,
  isExplored: false,
  label: 'Topic',
  mapId: 'map-1',
  messageCount: 0,
  nodeId: 'topic-0',
  parentNodeId: null,
  position: { x: 0, y: 0 },
  type: 'topic' as const,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const branchNode = {
  createdAt: '2026-01-01T00:00:00.000Z',
  depth: 1,
  fromSuggestion: false,
  id: 'branch-id',
  isCollapsed: false,
  isExplored: false,
  label: 'Branch',
  mapId: 'map-1',
  messageCount: 0,
  nodeId: 'branch-1',
  parentNodeId: 'topic-0',
  position: { x: 240, y: 0 },
  type: 'branch' as const,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const storeState = {
  map: {
    createdAt: '2026-01-01T00:00:00.000Z',
    id: 'map-1',
    nodeCount: 2,
    rootNodeId: 'topic-0',
    settings: {
      autoSuggestEnabled: true,
      autoSuggestIdleSeconds: 10,
      maxSuggestionsPerNode: 4,
    },
    sourceConversationId: null,
    status: 'active',
    title: 'Test map',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
  },
  nodes: {
    [branchNode.nodeId]: branchNode,
    [topicNode.nodeId]: topicNode,
  },
  selectedNodeId: null as null | string,
};

const thoughtMapActions = {
  acceptGhostNode: mockAcceptGhostNode,
  deleteNode: mockDeleteNode,
  removeGhostNode: mockRemoveGhostNode,
  setMap: mockSetMap,
  setSelectedNodeId: mockSetSelectedNodeId,
  updateNode: mockUpdateNode,
};

const suggestionHookResult = {
  isStreaming: false,
  requestSuggestions: mockRequestSuggestions,
};

jest.mock('@xyflow/react/dist/style.css', () => ({}));

jest.mock('@xyflow/react', () => {
  return {
    Background: () => null,
    BackgroundVariant: {
      Dots: 'dots',
    },
    Handle: () => null,
    Position: {
      Bottom: 'bottom',
      Left: 'left',
      Right: 'right',
      Top: 'top',
    },
    ReactFlow: ({ children, nodes, onNodeClick, onNodesChange }: any) => {
      const targetNode =
        nodes.find((node: { id: string }) => node.id === branchNode.nodeId) ?? nodes[0];

      return (
        <div>
          <button
            onClick={() => onNodesChange?.([{ id: targetNode.id, selected: true, type: 'select' }])}
            type="button"
          >
            select node
          </button>
          <button onClick={() => onNodeClick?.({}, targetNode)} type="button">
            click node
          </button>
          {children}
        </div>
      );
    },
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    useNodesState: (initialNodes: unknown[]) => [initialNodes, mockSetNodes, mockOnNodesChange],
  };
});

jest.mock('@/lib/hooks/use-thought-map', () => ({
  useThoughtMap: () => ({
    data: {
      map: storeState.map,
      nodes: Object.values(storeState.nodes),
    },
    error: null,
    isLoading: false,
  }),
}));

jest.mock('@/lib/hooks/use-thought-map-suggestions', () => ({
  ghostNodeToFlowNodeId: (ghost: { ghostId: string }) => `ghost-${ghost.ghostId}`,
  useColdStartSuggestions: jest.fn(),
  useGhostNodeAutoDismiss: jest.fn(),
  useThoughtMapSuggestions: () => suggestionHookResult,
}));

jest.mock('@/lib/stores/thought-map-store', () => ({
  useGhostNodes: () => [],
  useThoughtMapActions: () => thoughtMapActions,
  useThoughtMapNodes: () => storeState.nodes,
  useThoughtMapStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

jest.mock('../CreateNodeDialog', () => ({
  CreateNodeDialog: () => null,
}));

jest.mock('../ThoughtMapDialoguePanel', () => ({
  ThoughtMapDialoguePanel: ({ node }: { node: { label: string } }) => (
    <div>Dialogue: {node.label}</div>
  ),
}));

jest.mock('../ThoughtMapToolbar', () => ({
  ThoughtMapToolbar: () => null,
}));

describe('ThoughtMapCanvas dialogue behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeState.selectedNodeId = null;
    mockSetNodes.mockReset();
    mockOnNodesChange.mockReset();
  });

  it('does not open the dialogue panel on selection changes alone', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    await user.click(screen.getByRole('button', { name: /select node/i }));

    expect(mockSetSelectedNodeId).toHaveBeenCalledWith('branch-1');
    expect(screen.queryByText('Dialogue: Branch')).not.toBeInTheDocument();
  });

  it('opens the dialogue panel when the node is explicitly clicked', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    await user.click(screen.getByRole('button', { name: /click node/i }));

    expect(screen.getByText('Dialogue: Branch')).toBeInTheDocument();
  });
});
